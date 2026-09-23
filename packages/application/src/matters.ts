import { createHash } from "node:crypto";
import { processingPolicySchema } from "@patent/contracts";
import { type Database, schema, type TenantTx, withTenant } from "@patent/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { canonicalJson } from "./canonical";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";

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
  processingPolicy: processingPolicySchema.optional(),
  runBudgetMicrousd: z
    .string()
    .regex(/^\d+$/, "run budget must be a nonnegative integer")
    .optional(),
});
export type CreateMatterInput = z.input<typeof createMatterInput>;

export const aclRole = z.enum(["owner", "editor", "reviewer", "viewer"]);

const aclRoles = ["owner", "editor", "reviewer", "viewer"] as const;
type AclRole = (typeof aclRoles)[number];

async function requireRole(
  tx: TenantTx,
  matterId: string,
  userId: string,
  allowed: readonly AclRole[],
): Promise<AclRole> {
  const [row] = await tx
    .select({ role: schema.matterAcl.role })
    .from(schema.matterAcl)
    .where(and(eq(schema.matterAcl.matterId, matterId), eq(schema.matterAcl.principalId, userId)));
  if (!row || !allowed.includes(row.role)) {
    throw new AppError("UNAUTHORIZED", "this action requires a stronger matter role");
  }
  return row.role;
}

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
        processingPolicy: input.processingPolicy ?? null,
        runBudgetMicrousd: input.runBudgetMicrousd ?? null,
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

    const digest = createHash("sha256")
      .update(
        canonicalJson({
          matterId: matter.id,
          idea: input.idea,
          goal: input.goal ?? null,
          processingPolicy: input.processingPolicy ?? null,
          runBudgetMicrousd: input.runBudgetMicrousd ?? null,
        }),
      )
      .digest("hex");
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
    const members = await tx
      .select()
      .from(schema.matterAcl)
      .where(eq(schema.matterAcl.matterId, matterId));
    return { matter, assertions: matterAssertions, members };
  });
}

/** Grant another principal access. Only an owner may grant. */
export async function addMatterMember(
  db: Database,
  ctx: AuthorizedContext,
  matterId: string,
  principalId: string,
  role: z.infer<typeof aclRole> = "viewer",
): Promise<void> {
  assertHumanActor(ctx);
  await withTenant(db, ctx, async (tx) => {
    await requireRole(tx, matterId, ctx.userId, ["owner"]);
    await tx
      .insert(schema.matterAcl)
      .values({ tenantId: ctx.tenantId, matterId, principalId, role })
      .onConflictDoNothing();
  });
}

/** Revoke a principal. The last owner cannot be removed. */
export async function revokeMatterMember(
  db: Database,
  ctx: AuthorizedContext,
  matterId: string,
  principalId: string,
): Promise<void> {
  assertHumanActor(ctx);
  await withTenant(db, ctx, async (tx) => {
    await requireRole(tx, matterId, ctx.userId, ["owner"]);
    const [target] = await tx
      .select({ role: schema.matterAcl.role })
      .from(schema.matterAcl)
      .where(
        and(eq(schema.matterAcl.matterId, matterId), eq(schema.matterAcl.principalId, principalId)),
      );
    if (!target) return;
    if (target.role === "owner") {
      const owners = await tx
        .select({ id: schema.matterAcl.id })
        .from(schema.matterAcl)
        .where(and(eq(schema.matterAcl.matterId, matterId), eq(schema.matterAcl.role, "owner")));
      if (owners.length <= 1) {
        throw new AppError("POLICY_BLOCKED", "the last owner cannot be revoked");
      }
    }
    await tx
      .delete(schema.matterAcl)
      .where(
        and(eq(schema.matterAcl.matterId, matterId), eq(schema.matterAcl.principalId, principalId)),
      );
  });
}
