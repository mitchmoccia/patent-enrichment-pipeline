import { createHash, randomUUID } from "node:crypto";
import { processingPolicyDraftSchema, processingPolicySchema } from "@patent/contracts";
import { type Database, schema, withTenant } from "@patent/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { canonicalJson } from "./canonical";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";

const budgetField = z.string().regex(/^\d+$/, "run budget must be a nonnegative integer");

export const updateGoalInput = z.object({
  matterId: z.string().uuid(),
  goal: z.string().trim().min(1).max(2000),
  expectedRevision: z.number().int().nonnegative(),
});

async function lockMatter(
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  matterId: string,
) {
  const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
  return matter ?? null;
}

async function nextSnapshot(
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  tenantId: string,
  matterId: string,
  revision: number,
  payload: unknown,
) {
  const [parent] = await tx
    .select({ id: schema.matterSnapshots.id })
    .from(schema.matterSnapshots)
    .where(eq(schema.matterSnapshots.matterId, matterId))
    .orderBy(desc(schema.matterSnapshots.revision))
    .limit(1);
  const digest = createHash("sha256").update(canonicalJson(payload)).digest("hex");
  await tx.insert(schema.matterSnapshots).values({
    tenantId,
    matterId,
    revision,
    digest,
    parentSnapshotId: parent?.id,
  });
  return digest;
}

/** Goal stays editable. Each save is a successor snapshot, not an in-place history rewrite. */
export async function updateMatterGoal(
  db: Database,
  ctx: AuthorizedContext,
  raw: z.input<typeof updateGoalInput>,
): Promise<{ revision: number }> {
  assertHumanActor(ctx);
  const parsed = updateGoalInput.safeParse(raw);
  if (!parsed.success) {
    throw new AppError("VALIDATION_FAILED", parsed.error.issues.map((i) => i.message).join("; "));
  }
  const input = parsed.data;
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, input.matterId);
    if (!matter) throw new AppError("UNAUTHORIZED", "revoked or unknown matter");
    if (matter.headRevision !== input.expectedRevision) {
      throw new AppError("REVISION_CONFLICT", "the matter changed; reload and try again");
    }
    const revision = matter.headRevision + 1;
    await tx
      .update(schema.matters)
      .set({ goal: input.goal, headRevision: revision })
      .where(eq(schema.matters.id, matter.id));
    await nextSnapshot(tx, ctx.tenantId, matter.id, revision, {
      kind: "goal",
      goal: input.goal,
      revision,
    });
    return { revision };
  });
}

export async function setRunBudget(
  db: Database,
  ctx: AuthorizedContext,
  matterId: string,
  runBudgetMicrousd: string,
  expectedRevision: number,
): Promise<{ revision: number }> {
  assertHumanActor(ctx);
  const amount = budgetField.safeParse(runBudgetMicrousd);
  if (!amount.success)
    throw new AppError("VALIDATION_FAILED", "run budget must be a nonnegative integer");
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, matterId);
    if (!matter) throw new AppError("UNAUTHORIZED", "revoked or unknown matter");
    if (matter.headRevision !== expectedRevision) {
      throw new AppError("REVISION_CONFLICT", "the matter changed; reload and try again");
    }
    const revision = matter.headRevision + 1;
    await tx
      .update(schema.matters)
      .set({ runBudgetMicrousd: amount.data, headRevision: revision })
      .where(eq(schema.matters.id, matter.id));
    await nextSnapshot(tx, ctx.tenantId, matter.id, revision, {
      kind: "budget",
      runBudgetMicrousd: amount.data,
      revision,
    });
    return { revision };
  });
}

export async function recordProcessingPolicy(
  db: Database,
  ctx: AuthorizedContext,
  matterId: string,
  draft: unknown,
  expectedRevision: number,
): Promise<{ revision: number }> {
  assertHumanActor(ctx);
  const parsed = processingPolicyDraftSchema.safeParse(draft);
  if (!parsed.success) {
    throw new AppError("VALIDATION_FAILED", parsed.error.issues.map((i) => i.message).join("; "));
  }
  const policy = processingPolicySchema.parse({
    ...parsed.data,
    id: randomUUID(),
    version: "1",
    trainingUseAllowed: false,
    dataAgreementRefs: [],
    approvalActorId: ctx.userId,
    approvedAt: new Date().toISOString(),
  });
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, matterId);
    if (!matter) throw new AppError("UNAUTHORIZED", "revoked or unknown matter");
    if (matter.headRevision !== expectedRevision) {
      throw new AppError("REVISION_CONFLICT", "the matter changed; reload and try again");
    }
    const revision = matter.headRevision + 1;
    await tx
      .update(schema.matters)
      .set({
        processingPolicy: policy,
        runBudgetMicrousd: policy.budgetCapMicrousd,
        headRevision: revision,
      })
      .where(eq(schema.matters.id, matter.id));
    await nextSnapshot(tx, ctx.tenantId, matter.id, revision, { kind: "policy", policy, revision });
    return { revision };
  });
}
