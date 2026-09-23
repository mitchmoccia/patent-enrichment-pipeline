import { createHash } from "node:crypto";
import { BudgetError } from "@patent/billing";
import { schema, type TenantTx } from "@patent/db";
import { and, eq, max, sql } from "drizzle-orm";
import { canonicalJson } from "./canonical";
import { AppError } from "./errors";

export function requestHash(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function asAppError(error: unknown): never {
  if (error instanceof BudgetError) throw new AppError(error.code, error.message);
  throw error;
}

export async function lockMatter(tx: TenantTx, matterId: string) {
  await tx.execute(sql`select id from matters where id = ${matterId} for update`);
  const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
  if (!matter) throw new AppError("UNAUTHORIZED", "revoked or unknown matter");
  return matter;
}

export async function requireEditor(tx: TenantTx, matterId: string, userId: string): Promise<void> {
  const [row] = await tx
    .select({ role: schema.matterAcl.role })
    .from(schema.matterAcl)
    .where(and(eq(schema.matterAcl.matterId, matterId), eq(schema.matterAcl.principalId, userId)));
  if (!row || (row.role !== "owner" && row.role !== "editor")) {
    throw new AppError("UNAUTHORIZED", "this action requires a stronger matter role");
  }
}

export async function loadRun(tx: TenantTx, runId: string) {
  const [run] = await tx.select().from(schema.runs).where(eq(schema.runs.id, runId));
  if (!run) throw new AppError("NOT_FOUND", "run not found");
  return run;
}

/** Caller holds the matter row lock so sequence numbers stay monotonic. */
export async function appendEvent(
  tx: TenantTx,
  tenantId: string,
  matterId: string,
  kind: string,
  payload: Record<string, unknown>,
): Promise<number> {
  const [row] = await tx
    .select({ sequence: max(schema.matterEvents.sequence) })
    .from(schema.matterEvents)
    .where(eq(schema.matterEvents.matterId, matterId));
  const sequence = Number(row?.sequence ?? 0) + 1;
  await tx.insert(schema.matterEvents).values({ tenantId, matterId, sequence, kind, payload });
  await tx.insert(schema.outbox).values({ tenantId, matterId, eventSequence: sequence, kind });
  return sequence;
}

export function assertRunnable(status: string): void {
  if (status === "paused") throw new AppError("POLICY_BLOCKED", "run is paused");
  if (status === "cancelled") throw new AppError("POLICY_BLOCKED", "run is cancelled");
  if (status === "completed") throw new AppError("POLICY_BLOCKED", "run is already complete");
}
