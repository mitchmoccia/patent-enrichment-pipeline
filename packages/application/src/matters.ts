import { createHash } from "node:crypto";
import { type Database, schema, withTenant } from "@patent/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { AuthorizedContext } from "./context.js";
import { AppError } from "./errors.js";

export const createMatterInput = z.object({
  title: z.string().trim().min(1, "title is required").max(300),
  idea: z.string().trim().min(1, "an initial idea is required").max(20000),
  goal: z.string().trim().max(2000).optional(),
  applicantMode: z
    .enum([
      "private_development",
      "individual_self_filer",
      "practitioner_supervised",
      "entity_applicant",
    ])
    .default("private_development"),
});
export type CreateMatterInput = z.input<typeof createMatterInput>;

export const aclRole = z.enum(["owner", "editor", "reviewer", "viewer"]);

async function assertMembership(db: Database, ctx: AuthorizedContext): Promise<void> {
  const rows = await db
    .select({ id: schema.member.id })
    .from(schema.member)
    .where(
      and(eq(schema.member.organizationId, ctx.tenantId), eq(schema.member.userId, ctx.userId)),
    );
  if (rows.length === 0) {
    throw new AppError("UNAUTHORIZED", "actor is not a member of this organization");
  }
}

/**
 * Create a private matter: the matter row, the creator's owner ACL, the initial
 * idea stored as a versioned supplied_fact assertion (not just a title), and an
 * immutable revision-0 snapshot. Runs under RLS via the tenant context.
 */
export async function createMatter(
  db: Database,
  ctx: AuthorizedContext,
  rawInput: CreateMatterInput,
): Promise<{ id: string }> {
  const parsed = createMatterInput.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError("VALIDATION_FAILED", parsed.error.issues.map((i) => i.message).join("; "));
  }
  await assertMembership(db, ctx);
  const input = parsed.data;

  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx
      .insert(schema.matters)
      .values({
        tenantId: ctx.tenantId,
        title: input.title,
        goal: input.goal,
        applicantMode: input.applicantMode,
        createdBy: ctx.userId,
      })
      .returning();
    if (!matter) throw new AppError("POLICY_BLOCKED", "matter creation was blocked");

    await tx.insert(schema.matterAcl).values({
      tenantId: ctx.tenantId,
      matterId: matter.id,
      principalId: ctx.userId,
      role: "owner",
    });

    await tx.insert(schema.assertions).values({
      tenantId: ctx.tenantId,
      matterId: matter.id,
      text: input.idea,
      classification: "supplied_fact",
      proposedByKind: "person",
      proposedById: ctx.userId,
    });

    const digest = createHash("sha256").update(`${matter.id}:${input.idea}`).digest("hex");
    await tx.insert(schema.matterSnapshots).values({
      tenantId: ctx.tenantId,
      matterId: matter.id,
      revision: 0,
      digest,
    });

    return { id: matter.id };
  });
}

export async function listMatters(db: Database, ctx: AuthorizedContext) {
  return withTenant(db, ctx, (tx) =>
    tx.select().from(schema.matters).orderBy(desc(schema.matters.createdAt)),
  );
}

export async function getMatter(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const matterAssertions = await tx
      .select()
      .from(schema.assertions)
      .where(eq(schema.assertions.matterId, matterId))
      .orderBy(desc(schema.assertions.createdAt));
    return { matter, assertions: matterAssertions };
  });
}

/** Grant another principal access to a matter (caller must already have access). */
export async function addMatterMember(
  db: Database,
  ctx: AuthorizedContext,
  matterId: string,
  principalId: string,
  role: z.infer<typeof aclRole> = "viewer",
): Promise<void> {
  await withTenant(db, ctx, (tx) =>
    tx
      .insert(schema.matterAcl)
      .values({ tenantId: ctx.tenantId, matterId, principalId, role })
      .onConflictDoNothing(),
  );
}

/** Revoke a principal's access to a matter. */
export async function revokeMatterMember(
  db: Database,
  ctx: AuthorizedContext,
  matterId: string,
  principalId: string,
): Promise<void> {
  await withTenant(db, ctx, (tx) =>
    tx
      .delete(schema.matterAcl)
      .where(
        and(eq(schema.matterAcl.matterId, matterId), eq(schema.matterAcl.principalId, principalId)),
      ),
  );
}
