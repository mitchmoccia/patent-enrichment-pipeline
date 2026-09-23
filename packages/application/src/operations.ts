import { approveWatch, providerHealth, redactAnalytics, stripeEntitlements } from "@patent/billing";
import { type Database, schema, withTenant } from "@patent/db";
import { desc, eq } from "drizzle-orm";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { lockMatter, requireEditor } from "./run-shared";

function configured(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.length > 0;
}

export function operationHealth() {
  const stripe = stripeEntitlements({
    secret: configured("STRIPE_SECRET_KEY"),
    webhook: configured("STRIPE_WEBHOOK_SECRET"),
  });
  return {
    stripe,
    providers: [
      providerHealth("stripe", stripe.status !== "unavailable"),
      providerHealth("posthog", configured("POSTHOG_KEY") && configured("POSTHOG_HOST")),
      providerHealth("otel", configured("OTEL_EXPORTER_OTLP_ENDPOINT")),
    ],
  };
}

export async function approveWatchPlan(
  db: Database,
  ctx: AuthorizedContext,
  input: {
    matterId: string;
    source: string;
    cadence: string;
    budgetMicrousd: string;
    approved: boolean;
  },
) {
  assertHumanActor(ctx);
  let plan: ReturnType<typeof approveWatch>;
  try {
    plan = approveWatch(input);
  } catch (error) {
    throw new AppError("POLICY_BLOCKED", error instanceof Error ? error.message : "watch refused");
  }
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [row] = await tx
      .insert(schema.watchPlans)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        source: plan.source,
        cadence: plan.cadence,
        budgetMicrousd: plan.budgetMicrousd,
        approved: true,
        demandLetters: false,
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "watch plan was not recorded");
    return row;
  });
}

export async function recordAnalytics(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; properties: Record<string, string> },
) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx
      .select()
      .from(schema.matters)
      .where(eq(schema.matters.id, input.matterId));
    if (!matter) return null;
    try {
      return redactAnalytics(input.properties);
    } catch (error) {
      throw new AppError(
        "POLICY_BLOCKED",
        error instanceof Error ? error.message : "analytics refused",
      );
    }
  });
}

export async function sendDemand(): Promise<never> {
  throw new AppError("POLICY_BLOCKED", "demand letters are not sent");
}

export async function getOperations(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const plans = await tx
      .select()
      .from(schema.watchPlans)
      .where(eq(schema.watchPlans.matterId, matterId))
      .orderBy(desc(schema.watchPlans.createdAt));
    return { health: operationHealth(), plans };
  });
}
