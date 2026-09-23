import { type Database, schema, withTenant } from "@patent/db";
import { readResumePayload, stageGraph } from "@patent/workflows";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { releaseReserved } from "./run-budget";
import { appendEvent, loadRun, lockMatter, requestHash, requireEditor } from "./run-shared";
import { completeIngest, completeUnavailableAnalysis } from "./run-stages";

const startInput = z.object({
  matterId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(1).max(200),
});

const decisionKinds = ["pause", "cancel", "resume"] as const;
type DecisionKind = (typeof decisionKinds)[number];

export interface RunView {
  id: string;
  status: string;
  fenceToken: number;
  stages: { name: string; status: string; output: Record<string, unknown> | null }[];
  reservations: {
    operationId: string;
    status: string;
    amountMicrousd: string | null;
    known: boolean;
  }[];
}

export interface MatterEventView {
  sequence: number;
  kind: string;
}

export async function startRun(
  db: Database,
  ctx: AuthorizedContext,
  raw: z.input<typeof startInput>,
): Promise<{ runId: string; replayed: boolean }> {
  assertHumanActor(ctx);
  const parsed = startInput.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_FAILED",
      parsed.error.issues.map((issue) => issue.message).join("; "),
    );
  }
  const input = parsed.data;
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, input.matterId);
    await requireEditor(tx, input.matterId, ctx.userId);
    const hash = requestHash({
      matterId: input.matterId,
      idempotencyKey: input.idempotencyKey,
      revision: matter.headRevision,
    });
    const [existing] = await tx
      .select()
      .from(schema.idempotencyCommands)
      .where(
        and(
          eq(schema.idempotencyCommands.matterId, input.matterId),
          eq(schema.idempotencyCommands.actorId, ctx.userId),
          eq(schema.idempotencyCommands.operation, "start_run"),
          eq(schema.idempotencyCommands.key, input.idempotencyKey),
        ),
      );
    if (existing) {
      if (existing.requestHash !== hash) {
        throw new AppError(
          "IDEMPOTENCY_CONFLICT",
          "this start key was already used for a different request",
        );
      }
      const runId = existing.response.runId;
      if (typeof runId !== "string")
        throw new AppError("POLICY_BLOCKED", "stored start response is unusable");
      return { runId, replayed: true };
    }
    const [run] = await tx
      .insert(schema.runs)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        snapshotRevision: matter.headRevision,
        idempotencyKey: input.idempotencyKey,
        requestHash: hash,
        createdBy: ctx.userId,
      })
      .returning();
    if (!run) throw new AppError("POLICY_BLOCKED", "run was not recorded");
    for (const name of stageGraph) {
      await tx.insert(schema.stages).values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        runId: run.id,
        name,
        status: "pending",
      });
    }
    await tx.insert(schema.idempotencyCommands).values({
      tenantId: ctx.tenantId,
      matterId: input.matterId,
      actorId: ctx.userId,
      operation: "start_run",
      key: input.idempotencyKey,
      requestHash: hash,
      response: { runId: run.id },
    });
    await appendEvent(tx, ctx.tenantId, input.matterId, "run.started", { runId: run.id });
    return { runId: run.id, replayed: false };
  });
}

export async function recordRunDecision(
  db: Database,
  ctx: AuthorizedContext,
  runId: string,
  kind: DecisionKind,
): Promise<{ decisionId: string }> {
  assertHumanActor(ctx);
  if (!decisionKinds.includes(kind)) throw new AppError("VALIDATION_FAILED", "unknown decision");
  return withTenant(db, ctx, async (tx) => {
    const run = await loadRun(tx, runId);
    await lockMatter(tx, run.matterId);
    await requireEditor(tx, run.matterId, ctx.userId);
    const [decision] = await tx
      .insert(schema.runDecisions)
      .values({
        tenantId: ctx.tenantId,
        matterId: run.matterId,
        runId: run.id,
        kind,
        actorId: ctx.userId,
        snapshotRevision: run.snapshotRevision,
      })
      .returning();
    if (!decision) throw new AppError("POLICY_BLOCKED", "decision was not recorded");
    if (kind === "pause" && run.status === "running") {
      await tx.update(schema.runs).set({ status: "paused" }).where(eq(schema.runs.id, run.id));
      await appendEvent(tx, ctx.tenantId, run.matterId, "run.paused", {
        runId: run.id,
        decisionId: decision.id,
      });
    }
    if (kind === "cancel" && run.status !== "cancelled") {
      await tx.update(schema.runs).set({ status: "cancelled" }).where(eq(schema.runs.id, run.id));
      await releaseReserved(tx, run.id);
      await appendEvent(tx, ctx.tenantId, run.matterId, "run.cancelled", {
        runId: run.id,
        decisionId: decision.id,
      });
    }
    return { decisionId: decision.id };
  });
}

export async function resumeRun(
  db: Database,
  ctx: AuthorizedContext,
  payload: unknown,
): Promise<{ runId: string }> {
  assertHumanActor(ctx);
  let decisionId: string;
  try {
    decisionId = readResumePayload(payload).decisionId;
  } catch (error) {
    const message = error instanceof Error ? error.message : "resume requires a decision id";
    throw new AppError("VALIDATION_FAILED", message);
  }
  return withTenant(db, ctx, async (tx) => {
    const [decision] = await tx
      .select()
      .from(schema.runDecisions)
      .where(eq(schema.runDecisions.id, decisionId));
    if (decision?.kind !== "resume") {
      throw new AppError("VALIDATION_FAILED", "resume requires a recorded resume decision");
    }
    const run = await loadRun(tx, decision.runId);
    await lockMatter(tx, run.matterId);
    await requireEditor(tx, run.matterId, ctx.userId);
    if (run.status === "cancelled")
      throw new AppError("POLICY_BLOCKED", "a cancelled run stays cancelled");
    if (run.snapshotRevision !== decision.snapshotRevision) {
      throw new AppError("REVISION_CONFLICT", "the decision does not match this run");
    }
    await tx.update(schema.runs).set({ status: "running" }).where(eq(schema.runs.id, run.id));
    await appendEvent(tx, ctx.tenantId, run.matterId, "run.resumed", { runId: run.id, decisionId });
    return { runId: run.id };
  });
}

export async function advanceRun(
  db: Database,
  ctx: AuthorizedContext,
  runId: string,
  env: { AI_GATEWAY_API_KEY?: string },
): Promise<{ ingestReplayed: boolean; analysisReplayed: boolean }> {
  const ingest = await completeIngest(db, ctx, runId);
  const configured = Boolean(env.AI_GATEWAY_API_KEY);
  const analysis = await completeUnavailableAnalysis(
    db,
    ctx,
    runId,
    configured ? "not_executed" : "provider_unavailable",
    configured
      ? "A gateway key is set, but this stage does not call a model or invent analysis text."
      : "No model route is configured. No analysis text was produced.",
  );
  return { ingestReplayed: ingest.replayed, analysisReplayed: analysis.replayed };
}

export async function listMatterRuns(
  db: Database,
  ctx: AuthorizedContext,
  matterId: string,
): Promise<RunView[]> {
  return withTenant(db, ctx, async (tx) => {
    const runs = await tx
      .select()
      .from(schema.runs)
      .where(eq(schema.runs.matterId, matterId))
      .orderBy(desc(schema.runs.createdAt));
    const stages = await tx
      .select()
      .from(schema.stages)
      .where(eq(schema.stages.matterId, matterId));
    const reservations = await tx
      .select()
      .from(schema.reservations)
      .where(eq(schema.reservations.matterId, matterId));
    return runs.map((run) => ({
      id: run.id,
      status: run.status,
      fenceToken: run.fenceToken,
      stages: stages
        .filter((stage) => stage.runId === run.id)
        .map((stage) => ({ name: stage.name, status: stage.status, output: stage.output ?? null })),
      reservations: reservations
        .filter((row) => row.runId === run.id)
        .map((row) => ({
          operationId: row.operationId,
          status: row.status,
          amountMicrousd: row.amountMicrousd,
          known: row.known,
        })),
    }));
  });
}

export async function listMatterEvents(
  db: Database,
  ctx: AuthorizedContext,
  matterId: string,
  afterSequence: number,
): Promise<MatterEventView[]> {
  if (!Number.isInteger(afterSequence) || afterSequence < 0) {
    throw new AppError("VALIDATION_FAILED", "event cursor must be a nonnegative integer");
  }
  return withTenant(db, ctx, async (tx) =>
    tx
      .select({ sequence: schema.matterEvents.sequence, kind: schema.matterEvents.kind })
      .from(schema.matterEvents)
      .where(
        and(
          eq(schema.matterEvents.matterId, matterId),
          gt(schema.matterEvents.sequence, afterSequence),
        ),
      )
      .orderBy(asc(schema.matterEvents.sequence)),
  );
}
