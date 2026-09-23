import { randomUUID } from "node:crypto";
import { createDb, type Database, schema, withTenant } from "@patent/db";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  advanceRun,
  commitLeasedStage,
  completeIngest,
  createMatter,
  dispatchAnalysis,
  leaseStage,
  listMatterEvents,
  listMatterRuns,
  ProviderTimeout,
  recordProviderCallback,
  recordRunDecision,
  recordUnresolvedProviderCost,
  reserveRunSpend,
  resumeRun,
  setRunBudget,
  startRun,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

run("S03 durable runs", () => {
  let app: Database;
  let owner: Database;
  let appPool: pg.Pool;
  let ownerPool: pg.Pool;
  const orgA = `org_${randomUUID()}`;
  const orgB = `org_${randomUUID()}`;
  const userA = `user_${randomUUID()}`;
  const userB = `user_${randomUUID()}`;
  const ctxA: AuthorizedContext = { tenantId: orgA, userId: userA, actorKind: "person" };
  const ctxB: AuthorizedContext = { tenantId: orgB, userId: userB, actorKind: "person" };
  const modelA: AuthorizedContext = { tenantId: orgA, userId: userA, actorKind: "model" };
  let matterId = "";

  beforeAll(async () => {
    ({ db: app, pool: appPool } = createDb(appUrl as string));
    ({ db: owner, pool: ownerPool } = createDb(migUrl as string));
    await owner.insert(schema.organization).values([
      { id: orgA, name: "A" },
      { id: orgB, name: "B" },
    ]);
    await owner.insert(schema.user).values([
      { id: userA, name: "A", email: `${userA}@e.test` },
      { id: userB, name: "B", email: `${userB}@e.test` },
    ]);
    await owner.insert(schema.member).values([
      { id: randomUUID(), organizationId: orgA, userId: userA, role: "owner" },
      { id: randomUUID(), organizationId: orgB, userId: userB, role: "owner" },
    ]);
    matterId = (
      await createMatter(app, ctxA, {
        title: "Runs",
        idea: "A worker must not spend the same authority twice.",
        runBudgetMicrousd: "1000000",
      })
    ).id;
  });

  afterAll(async () => {
    await owner.delete(schema.matters).where(eq(schema.matters.tenantId, orgA));
    await owner.delete(schema.organization).where(eq(schema.organization.id, orgA));
    await owner.delete(schema.organization).where(eq(schema.organization.id, orgB));
    await owner.delete(schema.user).where(eq(schema.user.id, userA));
    await owner.delete(schema.user).where(eq(schema.user.id, userB));
    await appPool?.end();
    await ownerPool?.end();
  });

  async function matter(cap: string): Promise<string> {
    return (
      await createMatter(app, ctxA, {
        title: "Budget",
        idea: "Cap enforcement.",
        runBudgetMicrousd: cap,
      })
    ).id;
  }

  it("replays a committed ingest without a second attempt", async () => {
    const started = await startRun(app, ctxA, { matterId, idempotencyKey: "ingest-1" });
    const again = await startRun(app, ctxA, { matterId, idempotencyKey: "ingest-1" });
    expect(again).toEqual({ runId: started.runId, replayed: true });
    await completeIngest(app, ctxA, started.runId);
    const replay = await completeIngest(app, ctxA, started.runId);
    expect(replay.replayed).toBe(true);
    const attempts = await withTenant(app, ctxA, (tx) =>
      tx.select().from(schema.stepAttempts).where(eq(schema.stepAttempts.runId, started.runId)),
    );
    expect(attempts.filter((row) => row.status === "committed")).toHaveLength(1);
  });

  it("returns events after a cursor in sequence order", async () => {
    const before = await listMatterEvents(app, ctxA, matterId, 0);
    const cursor = before.at(-1)?.sequence ?? 0;
    const started = await startRun(app, ctxA, { matterId, idempotencyKey: "events-1" });
    await recordRunDecision(app, ctxA, started.runId, "pause");
    const page = await listMatterEvents(app, ctxA, matterId, cursor);
    expect(page.map((event) => event.kind)).toEqual(["run.started", "run.paused"]);
    const tail = await listMatterEvents(app, ctxA, matterId, page[0]?.sequence ?? cursor);
    expect(tail.map((event) => event.kind)).toEqual(["run.paused"]);
    const box = await withTenant(app, ctxA, (tx) =>
      tx.select().from(schema.outbox).where(eq(schema.outbox.matterId, matterId)),
    );
    expect(box.length).toBeGreaterThan(0);
  });

  it("rejects a stale worker result", async () => {
    const started = await startRun(app, ctxA, { matterId, idempotencyKey: "fence-1" });
    const first = await leaseStage(app, ctxA, started.runId, "ingest");
    const second = await leaseStage(app, ctxA, started.runId, "ingest");
    const stale = await commitLeasedStage(app, ctxA, first, { source: "stale-worker" });
    const current = await commitLeasedStage(app, ctxA, second, { source: "current-worker" });
    expect(stale.accepted).toBe(false);
    expect(current.accepted).toBe(true);
    const [view] = (await listMatterRuns(app, ctxA, matterId)).filter(
      (row) => row.id === started.runId,
    );
    expect(view?.stages.find((stage) => stage.name === "ingest")?.output).toMatchObject({
      source: "current-worker",
    });
  });

  it("does not call the provider again after a timeout and keeps the quoted cost", async () => {
    const started = await startRun(app, ctxA, { matterId, idempotencyKey: "timeout-1" });
    let calls = 0;
    const execute = async () => {
      calls += 1;
      throw new ProviderTimeout();
    };
    const first = await dispatchAnalysis(app, ctxA, {
      runId: started.runId,
      operationId: "timeout-op",
      quoteMicrousd: "30",
      execute,
    });
    const second = await dispatchAnalysis(app, ctxA, {
      runId: started.runId,
      operationId: "timeout-op",
      quoteMicrousd: "30",
      execute,
    });
    expect(first.outcome).toBe("unknown");
    expect(second.outcome).toBe("replayed");
    expect(calls).toBe(1);
    const [view] = (await listMatterRuns(app, ctxA, matterId)).filter(
      (row) => row.id === started.runId,
    );
    expect(view?.reservations).toEqual([
      { operationId: "timeout-op", status: "unknown", amountMicrousd: "30", known: true },
    ]);
  });

  it("applies one callback once", async () => {
    const started = await startRun(app, ctxA, { matterId, idempotencyKey: "callback-1" });
    await reserveRunSpend(app, ctxA, {
      runId: started.runId,
      operationId: "callback-op",
      amountMicrousd: "20",
      requestHash: "callback-hash",
    });
    const callback = {
      matterId,
      callbackId: "cb-1",
      operationId: "callback-op",
      payloadHash: "hash-1",
    };
    expect(await recordProviderCallback(app, ctxA, callback)).toEqual({ duplicate: false });
    expect(await recordProviderCallback(app, ctxA, callback)).toEqual({ duplicate: true });
    const [view] = (await listMatterRuns(app, ctxA, matterId)).filter(
      (row) => row.id === started.runId,
    );
    expect(view?.reservations[0]).toMatchObject({ status: "committed", amountMicrousd: "20" });
  });

  it("lets only one of two racing reservations through a tight cap", async () => {
    const id = await matter("100");
    const started = await startRun(app, ctxA, { matterId: id, idempotencyKey: "race-1" });
    const results = await Promise.allSettled([
      reserveRunSpend(app, ctxA, {
        runId: started.runId,
        operationId: "race-a",
        amountMicrousd: "60",
        requestHash: "race-a",
      }),
      reserveRunSpend(app, ctxA, {
        runId: started.runId,
        operationId: "race-b",
        amountMicrousd: "60",
        requestHash: "race-b",
      }),
    ]);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected")
      expect(rejected.reason).toMatchObject({ code: "BUDGET_EXCEEDED" });
    const view = await listMatterRuns(app, ctxA, id);
    expect(view[0]?.reservations).toHaveLength(1);
    await owner.delete(schema.matters).where(eq(schema.matters.id, id));
  });

  it("keeps an unknown amount visible and blocks further spend", async () => {
    const id = await matter("100");
    const started = await startRun(app, ctxA, { matterId: id, idempotencyKey: "unknown-1" });
    await reserveRunSpend(app, ctxA, {
      runId: started.runId,
      operationId: "unknown-op",
      amountMicrousd: "30",
      requestHash: "unknown-hash",
    });
    await recordUnresolvedProviderCost(app, ctxA, "unknown-op");
    await expect(
      reserveRunSpend(app, ctxA, {
        runId: started.runId,
        operationId: "unknown-next",
        amountMicrousd: "1",
        requestHash: "next",
      }),
    ).rejects.toMatchObject({ code: "EXTERNAL_OUTCOME_UNKNOWN" });
    const [view] = await listMatterRuns(app, ctxA, id);
    expect(view?.reservations[0]).toMatchObject({
      status: "unknown",
      known: false,
      amountMicrousd: null,
    });
    await owner.delete(schema.matters).where(eq(schema.matters.id, id));
  });

  it("refuses a model actor that tries to raise the cap or resume a run", async () => {
    await expect(setRunBudget(app, modelA, matterId, "9999999", 0)).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
    });
    const started = await startRun(app, ctxA, { matterId, idempotencyKey: "model-1" });
    const decision = await recordRunDecision(app, ctxA, started.runId, "resume");
    await expect(resumeRun(app, modelA, { decisionId: decision.decisionId })).rejects.toMatchObject(
      {
        code: "POLICY_BLOCKED",
      },
    );
  });

  it("resumes only from a recorded decision id", async () => {
    await expect(resumeRun(app, ctxA, { approved: true })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    const started = await startRun(app, ctxA, { matterId, idempotencyKey: "resume-1" });
    await recordRunDecision(app, ctxA, started.runId, "pause");
    const decision = await recordRunDecision(app, ctxA, started.runId, "resume");
    const resumed = await resumeRun(app, ctxA, { decisionId: decision.decisionId });
    expect(resumed.runId).toBe(started.runId);
    const [view] = (await listMatterRuns(app, ctxA, matterId)).filter(
      (row) => row.id === started.runId,
    );
    expect(view?.status).toBe("running");
  });

  it("releases an unused reservation on cancel and keeps an unknown cost", async () => {
    const id = await matter("1000");
    const started = await startRun(app, ctxA, { matterId: id, idempotencyKey: "cancel-1" });
    await reserveRunSpend(app, ctxA, {
      runId: started.runId,
      operationId: "cancel-open",
      amountMicrousd: "15",
      requestHash: "cancel-open",
    });
    await reserveRunSpend(app, ctxA, {
      runId: started.runId,
      operationId: "cancel-unknown",
      amountMicrousd: "10",
      requestHash: "cancel-unknown",
    });
    await recordUnresolvedProviderCost(app, ctxA, "cancel-unknown");
    await recordRunDecision(app, ctxA, started.runId, "cancel");
    const [view] = await listMatterRuns(app, ctxA, id);
    const open = view?.reservations.find((row) => row.operationId === "cancel-open");
    const unknown = view?.reservations.find((row) => row.operationId === "cancel-unknown");
    expect(open?.status).toBe("released");
    expect(unknown).toMatchObject({ status: "unknown", known: false, amountMicrousd: null });
    await owner.delete(schema.matters).where(eq(schema.matters.id, id));
  });

  it("hides runs from another tenant and records an unavailable analysis without spend", async () => {
    expect(await listMatterRuns(app, ctxB, matterId)).toEqual([]);
    const started = await startRun(app, ctxA, { matterId, idempotencyKey: "advance-1" });
    await advanceRun(app, ctxA, started.runId, {});
    const [view] = (await listMatterRuns(app, ctxA, matterId)).filter(
      (row) => row.id === started.runId,
    );
    expect(view?.status).toBe("blocked");
    expect(view?.reservations).toEqual([]);
    expect(view?.stages.find((stage) => stage.name === "analyze")?.output).toMatchObject({
      outcome: "provider_unavailable",
      text: null,
    });
  });
});
