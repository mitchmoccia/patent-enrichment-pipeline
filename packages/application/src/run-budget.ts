import { markUnknown, planReserve, type Reservation } from "@patent/billing";
import { type Database, schema, type TenantTx, withTenant } from "@patent/db";
import { and, eq } from "drizzle-orm";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { appendEvent, asAppError, loadRun, lockMatter, requireEditor } from "./run-shared";

interface ReserveInput {
  runId: string;
  operationId: string;
  amountMicrousd: string;
  requestHash: string;
}

function toLedger(row: {
  operationId: string;
  status: Reservation["status"];
  amountMicrousd: string | null;
  known: boolean;
  requestHash: string;
}): Reservation {
  return {
    operationId: row.operationId,
    status: row.status,
    amountMicrousd: row.amountMicrousd,
    known: row.known,
    requestHash: row.requestHash,
  };
}

async function planOnMatter(
  tx: TenantTx,
  matter: { id: string; tenantId: string; runBudgetMicrousd: string | null },
  runId: string,
  input: ReserveInput,
) {
  if (!matter.runBudgetMicrousd) throw new AppError("BUDGET_EXCEEDED", "no approved run cap");
  const rows = await tx
    .select()
    .from(schema.reservations)
    .where(eq(schema.reservations.matterId, matter.id));
  const plan = (() => {
    try {
      return planReserve(rows.map(toLedger), {
        operationId: input.operationId,
        amountMicrousd: input.amountMicrousd,
        requestHash: input.requestHash,
        capMicrousd: matter.runBudgetMicrousd,
      });
    } catch (error) {
      asAppError(error);
    }
  })();
  if (plan.created && plan.reservation.amountMicrousd) {
    await tx.insert(schema.reservations).values({
      tenantId: matter.tenantId,
      matterId: matter.id,
      runId,
      operationId: plan.reservation.operationId,
      status: "reserved",
      amountMicrousd: plan.reservation.amountMicrousd,
      known: true,
      requestHash: plan.reservation.requestHash,
    });
  }
  return plan;
}

export async function reserveRunSpend(
  db: Database,
  ctx: AuthorizedContext,
  input: ReserveInput,
): Promise<{ created: boolean }> {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    const run = await loadRun(tx, input.runId);
    const matter = await lockMatter(tx, run.matterId);
    await requireEditor(tx, run.matterId, ctx.userId);
    if (run.status !== "running")
      throw new AppError("POLICY_BLOCKED", "run is not accepting spend");
    const plan = await planOnMatter(tx, matter, run.id, input);
    return { created: plan.created };
  });
}

export async function releaseReserved(tx: TenantTx, runId: string): Promise<void> {
  await tx
    .update(schema.reservations)
    .set({ status: "released" })
    .where(and(eq(schema.reservations.runId, runId), eq(schema.reservations.status, "reserved")));
}

export async function recordUnresolvedProviderCost(
  db: Database,
  ctx: AuthorizedContext,
  operationId: string,
): Promise<void> {
  assertHumanActor(ctx);
  await withTenant(db, ctx, async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.operationId, operationId));
    if (!row) throw new AppError("NOT_FOUND", "reservation not found");
    await lockMatter(tx, row.matterId);
    const next = markUnknown(toLedger(row), false);
    await tx
      .update(schema.reservations)
      .set({ status: next.status, known: next.known, amountMicrousd: next.amountMicrousd })
      .where(eq(schema.reservations.id, row.id));
    await tx
      .update(schema.externalOperations)
      .set({ status: "unknown" })
      .where(eq(schema.externalOperations.operationId, operationId));
    await appendEvent(tx, ctx.tenantId, row.matterId, "reservation.unknown", { operationId });
  });
}

export async function recordProviderCallback(
  db: Database,
  ctx: AuthorizedContext,
  input: { matterId: string; callbackId: string; operationId: string; payloadHash: string },
): Promise<{ duplicate: boolean }> {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const [existing] = await tx
      .select({ id: schema.callbackReceipts.id })
      .from(schema.callbackReceipts)
      .where(eq(schema.callbackReceipts.callbackId, input.callbackId));
    if (existing) return { duplicate: true };
    await tx.insert(schema.callbackReceipts).values({
      tenantId: ctx.tenantId,
      matterId: input.matterId,
      callbackId: input.callbackId,
      operationId: input.operationId,
      payloadHash: input.payloadHash,
    });
    const [reservation] = await tx
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.operationId, input.operationId));
    if (reservation && reservation.status !== "committed" && reservation.status !== "released") {
      await tx
        .update(schema.reservations)
        .set({ status: "committed", known: reservation.amountMicrousd !== null })
        .where(eq(schema.reservations.id, reservation.id));
      await tx
        .update(schema.externalOperations)
        .set({ status: "completed" })
        .where(eq(schema.externalOperations.operationId, input.operationId));
      await appendEvent(tx, ctx.tenantId, input.matterId, "callback.applied", {
        operationId: input.operationId,
      });
    }
    return { duplicate: false };
  });
}

export { planOnMatter };
