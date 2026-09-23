import { type Database, schema, withTenant } from "@patent/db";
import { assessCommercial, RuleError } from "@patent/domain";
import { desc, eq } from "drizzle-orm";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { lockMatter, requireEditor } from "./run-shared";

function blocked(error: unknown): never {
  if (error instanceof RuleError) throw new AppError("POLICY_BLOCKED", error.message);
  throw error;
}

export async function recordCommercial(
  db: Database,
  ctx: AuthorizedContext,
  input: {
    matterId: string;
    buyer: string | null;
    substitute: string | null;
    evidenceRequest: string | null;
    strategy: string;
    decision: string;
    productRevenueMicrousd: string | null;
    productCostMicrousd: string | null;
    patentCostMicrousd: string | null;
    marketSizeMicrousd: string | null;
    licensingProbability: string | null;
  },
) {
  assertHumanActor(ctx);
  let assessed: ReturnType<typeof assessCommercial>;
  try {
    assessed = assessCommercial(input);
  } catch (error) {
    blocked(error);
  }
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.commercialAssessments)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        buyer: input.buyer,
        substitute: input.substitute,
        evidenceRequest: input.evidenceRequest,
        strategy: assessed.strategy,
        decision: assessed.decision,
        productRevenueMicrousd: input.productRevenueMicrousd,
        productCostMicrousd: input.productCostMicrousd,
        patentCostMicrousd: input.patentCostMicrousd,
        productCashflowMicrousd: assessed.productCashflowMicrousd,
        incrementalPatentValueMicrousd: null,
        unknowns: assessed.unknowns,
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "commercial assessment was not recorded");
    return row;
  });
}

export async function getCommercial(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const [latest] = await tx
      .select()
      .from(schema.commercialAssessments)
      .where(eq(schema.commercialAssessments.matterId, matterId))
      .orderBy(desc(schema.commercialAssessments.createdAt))
      .limit(1);
    const claims = await tx
      .select({ id: schema.claimDrafts.id })
      .from(schema.claimDrafts)
      .where(eq(schema.claimDrafts.matterId, matterId));
    return { assessment: latest ?? null, claimCount: claims.length };
  });
}
