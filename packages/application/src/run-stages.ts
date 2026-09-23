import { type Database, schema, type TenantTx, withTenant } from "@patent/db";
import type { StageName } from "@patent/workflows";
import { and, eq, max } from "drizzle-orm";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { planOnMatter } from "./run-budget";
import {
  appendEvent,
  assertRunnable,
  loadRun,
  lockMatter,
  requestHash,
  requireEditor,
} from "./run-shared";

export class ProviderTimeout extends Error {
  constructor() {
    super("the provider timed out after dispatch");
    this.name = "ProviderTimeout";
  }
}

interface Lease {
  attemptId: string;
  fence: number;
  stageId: string;
  runId: string;
  matterId: string;
}

async function loadStage(tx: TenantTx, runId: string, name: StageName) {
  const [stage] = await tx
    .select()
    .from(schema.stages)
    .where(and(eq(schema.stages.runId, runId), eq(schema.stages.name, name)));
  if (!stage) throw new AppError("NOT_FOUND", "stage not found");
  return stage;
}

async function leaseInTx(
  tx: TenantTx,
  run: { id: string; tenantId: string; matterId: string; fenceToken: number },
  stageId: string,
): Promise<Lease> {
  const fence = run.fenceToken + 1;
  await tx.update(schema.runs).set({ fenceToken: fence }).where(eq(schema.runs.id, run.id));
  await tx.update(schema.stages).set({ status: "leased" }).where(eq(schema.stages.id, stageId));
  const [countRow] = await tx
    .select({ n: max(schema.stepAttempts.attemptNumber) })
    .from(schema.stepAttempts)
    .where(eq(schema.stepAttempts.stageId, stageId));
  const [attempt] = await tx
    .insert(schema.stepAttempts)
    .values({
      tenantId: run.tenantId,
      matterId: run.matterId,
      runId: run.id,
      stageId,
      attemptNumber: Number(countRow?.n ?? 0) + 1,
      fenceToken: fence,
      status: "leased",
    })
    .returning();
  if (!attempt) throw new AppError("POLICY_BLOCKED", "attempt was not recorded");
  return { attemptId: attempt.id, fence, stageId, runId: run.id, matterId: run.matterId };
}

async function commitInTx(
  tx: TenantTx,
  tenantId: string,
  lease: Lease,
  output: Record<string, unknown>,
): Promise<{ accepted: boolean; replayed: boolean }> {
  const [attempt] = await tx
    .select()
    .from(schema.stepAttempts)
    .where(eq(schema.stepAttempts.id, lease.attemptId));
  if (!attempt) throw new AppError("NOT_FOUND", "attempt not found");
  if (attempt.status === "committed") return { accepted: true, replayed: true };
  if (attempt.status !== "leased") return { accepted: false, replayed: true };
  const [run] = await tx.select().from(schema.runs).where(eq(schema.runs.id, lease.runId));
  if (!run || run.fenceToken !== lease.fence) {
    await tx
      .update(schema.stepAttempts)
      .set({ status: "stale" })
      .where(eq(schema.stepAttempts.id, lease.attemptId));
    await appendEvent(tx, tenantId, lease.matterId, "stage.result_rejected", {
      runId: lease.runId,
      attemptId: lease.attemptId,
    });
    return { accepted: false, replayed: false };
  }
  await tx
    .update(schema.stepAttempts)
    .set({ status: "committed" })
    .where(eq(schema.stepAttempts.id, lease.attemptId));
  await tx
    .update(schema.stages)
    .set({ status: "completed", output })
    .where(eq(schema.stages.id, lease.stageId));
  await appendEvent(tx, tenantId, lease.matterId, "stage.completed", {
    runId: lease.runId,
    stageId: lease.stageId,
  });
  return { accepted: true, replayed: false };
}

export async function leaseStage(
  db: Database,
  ctx: AuthorizedContext,
  runId: string,
  name: StageName,
): Promise<Lease> {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    const run = await loadRun(tx, runId);
    await lockMatter(tx, run.matterId);
    await requireEditor(tx, run.matterId, ctx.userId);
    assertRunnable(run.status);
    const stage = await loadStage(tx, runId, name);
    if (stage.status === "completed")
      throw new AppError("POLICY_BLOCKED", "stage already finished");
    return leaseInTx(tx, run, stage.id);
  });
}

export async function commitLeasedStage(
  db: Database,
  ctx: AuthorizedContext,
  lease: Lease,
  output: Record<string, unknown>,
): Promise<{ accepted: boolean }> {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    await lockMatter(tx, lease.matterId);
    const result = await commitInTx(tx, ctx.tenantId, lease, output);
    return { accepted: result.accepted };
  });
}

export async function completeIngest(
  db: Database,
  ctx: AuthorizedContext,
  runId: string,
): Promise<{ replayed: boolean }> {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    const run = await loadRun(tx, runId);
    await lockMatter(tx, run.matterId);
    await requireEditor(tx, run.matterId, ctx.userId);
    const stage = await loadStage(tx, runId, "ingest");
    if (stage.status === "completed") return { replayed: true };
    assertRunnable(run.status);
    const artifacts = await tx
      .select({ id: schema.artifacts.id })
      .from(schema.artifacts)
      .where(
        and(eq(schema.artifacts.matterId, run.matterId), eq(schema.artifacts.scanStatus, "clean")),
      );
    const lease = await leaseInTx(tx, run, stage.id);
    await commitInTx(tx, ctx.tenantId, lease, {
      artifactCount: artifacts.length,
      source: "local-ingest",
    });
    return { replayed: false };
  });
}

export async function completeUnavailableAnalysis(
  db: Database,
  ctx: AuthorizedContext,
  runId: string,
  outcome: string,
  detail: string,
): Promise<{ replayed: boolean }> {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    const run = await loadRun(tx, runId);
    await lockMatter(tx, run.matterId);
    await requireEditor(tx, run.matterId, ctx.userId);
    const stage = await loadStage(tx, runId, "analyze");
    if (stage.status === "completed") return { replayed: true };
    assertRunnable(run.status);
    const open = await tx
      .select({ status: schema.reservations.status })
      .from(schema.reservations)
      .where(eq(schema.reservations.runId, runId));
    if (open.some((row) => row.status === "reserved" || row.status === "unknown")) {
      throw new AppError("EXTERNAL_OUTCOME_UNKNOWN", "an unresolved provider cost is still open");
    }
    const lease = await leaseInTx(tx, run, stage.id);
    await commitInTx(tx, ctx.tenantId, lease, { outcome, text: null, detail });
    await tx.update(schema.runs).set({ status: "blocked" }).where(eq(schema.runs.id, runId));
    return { replayed: false };
  });
}

interface PreparedCall {
  action: "call";
  lease: Lease;
  operationId: string;
}

interface PreparedStop {
  action: "stop";
  outcome: "unknown" | "replayed" | "completed";
}

async function markUnknownOperation(
  tx: TenantTx,
  tenantId: string,
  operationId: string,
  attemptId: string,
) {
  const [row] = await tx
    .select()
    .from(schema.reservations)
    .where(eq(schema.reservations.operationId, operationId));
  if (!row) throw new AppError("NOT_FOUND", "reservation not found");
  await tx
    .update(schema.reservations)
    .set({
      status: "unknown",
      known: row.amountMicrousd !== null,
      amountMicrousd: row.amountMicrousd,
    })
    .where(eq(schema.reservations.id, row.id));
  await tx
    .update(schema.externalOperations)
    .set({ status: "unknown" })
    .where(eq(schema.externalOperations.operationId, operationId));
  await tx
    .update(schema.stepAttempts)
    .set({ status: "failed" })
    .where(eq(schema.stepAttempts.id, attemptId));
  const [attempt] = await tx
    .select({ stageId: schema.stepAttempts.stageId })
    .from(schema.stepAttempts)
    .where(eq(schema.stepAttempts.id, attemptId));
  if (attempt) {
    await tx
      .update(schema.stages)
      .set({ status: "pending" })
      .where(eq(schema.stages.id, attempt.stageId));
  }
  await appendEvent(tx, tenantId, row.matterId, "analysis.outcome_unknown", { operationId });
}

export async function dispatchAnalysis(
  db: Database,
  ctx: AuthorizedContext,
  input: {
    runId: string;
    operationId: string;
    quoteMicrousd: string;
    execute: () => Promise<{ text: string }>;
  },
): Promise<{ outcome: "completed" | "unknown" | "replayed" | "stale" }> {
  assertHumanActor(ctx);
  const hash = requestHash({ operationId: input.operationId, quoteMicrousd: input.quoteMicrousd });
  const prepared = await withTenant(db, ctx, (tx) => prepareAnalysis(tx, ctx, input, hash));
  if (prepared.action === "stop") return { outcome: prepared.outcome };
  await withTenant(db, ctx, async (tx) => {
    await tx
      .update(schema.externalOperations)
      .set({ status: "dispatched" })
      .where(eq(schema.externalOperations.operationId, input.operationId));
  });
  try {
    const result = await input.execute();
    return await withTenant(db, ctx, (tx) => finishAnalysis(tx, ctx, prepared, result.text));
  } catch (error) {
    if (!(error instanceof ProviderTimeout)) throw error;
    await withTenant(db, ctx, (tx) =>
      markUnknownOperation(tx, ctx.tenantId, input.operationId, prepared.lease.attemptId),
    );
    return { outcome: "unknown" };
  }
}

async function prepareAnalysis(
  tx: TenantTx,
  ctx: AuthorizedContext,
  input: { runId: string; operationId: string; quoteMicrousd: string },
  hash: string,
): Promise<PreparedCall | PreparedStop> {
  const run = await loadRun(tx, input.runId);
  const matter = await lockMatter(tx, run.matterId);
  await requireEditor(tx, run.matterId, ctx.userId);
  assertRunnable(run.status);
  const stage = await loadStage(tx, run.id, "analyze");
  if (stage.status === "completed") return { action: "stop", outcome: "completed" };
  const [external] = await tx
    .select()
    .from(schema.externalOperations)
    .where(eq(schema.externalOperations.operationId, input.operationId));
  const [reservation] = await tx
    .select()
    .from(schema.reservations)
    .where(eq(schema.reservations.operationId, input.operationId));
  if (reservation?.status === "unknown" || external?.status === "unknown") {
    return { action: "stop", outcome: "replayed" };
  }
  if (external?.status === "dispatched") {
    if (reservation && reservation.status === "reserved") {
      await tx
        .update(schema.reservations)
        .set({ status: "unknown", known: reservation.amountMicrousd !== null })
        .where(eq(schema.reservations.id, reservation.id));
      await appendEvent(tx, ctx.tenantId, run.matterId, "analysis.outcome_unknown", {
        operationId: input.operationId,
      });
    }
    return { action: "stop", outcome: "unknown" };
  }
  if (!reservation) {
    await planOnMatter(tx, matter, run.id, {
      runId: run.id,
      operationId: input.operationId,
      amountMicrousd: input.quoteMicrousd,
      requestHash: hash,
    });
    await tx.insert(schema.externalOperations).values({
      tenantId: ctx.tenantId,
      matterId: run.matterId,
      runId: run.id,
      operationId: input.operationId,
      status: "prepared",
      requestHash: hash,
    });
  }
  const lease = await leaseInTx(tx, run, stage.id);
  return { action: "call", lease, operationId: input.operationId };
}

async function finishAnalysis(
  tx: TenantTx,
  ctx: AuthorizedContext,
  prepared: PreparedCall,
  text: string,
): Promise<{ outcome: "completed" | "stale" }> {
  await lockMatter(tx, prepared.lease.matterId);
  const committed = await commitInTx(tx, ctx.tenantId, prepared.lease, {
    outcome: "recorded",
    text,
  });
  await tx
    .update(schema.reservations)
    .set({ status: "committed" })
    .where(eq(schema.reservations.operationId, prepared.operationId));
  await tx
    .update(schema.externalOperations)
    .set({ status: "completed" })
    .where(eq(schema.externalOperations.operationId, prepared.operationId));
  if (!committed.accepted) return { outcome: "stale" };
  await tx
    .update(schema.runs)
    .set({ status: "completed" })
    .where(eq(schema.runs.id, prepared.lease.runId));
  return { outcome: "completed" };
}
