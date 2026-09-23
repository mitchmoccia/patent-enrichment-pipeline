import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDb, type Database, schema, withTenant } from "@patent/db";
import { localObjectStore } from "@patent/documents";
import { sha256Hex } from "@patent/security";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  acceptMechanismSuggestion,
  answerInventionQuestion,
  createMatter,
  extractInvention,
  getInvention,
  ingestArtifact,
  setRunBudget,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

const payment =
  "What happens when a payment service accepts a request but the local worker times out?";
const supplied =
  "Workers can duplicate process state. A copied in-memory balance does not reliably represent remaining authority.";

run("S04 mechanism intake", () => {
  let app: Database;
  let owner: Database;
  let appPool: pg.Pool;
  let ownerPool: pg.Pool;
  let dir = "";
  const orgA = `org_${randomUUID()}`;
  const orgB = `org_${randomUUID()}`;
  const userA = `user_${randomUUID()}`;
  const userB = `user_${randomUUID()}`;
  const ctxA: AuthorizedContext = { tenantId: orgA, userId: userA, actorKind: "person" };
  const ctxB: AuthorizedContext = { tenantId: orgB, userId: userB, actorKind: "person" };
  const modelA: AuthorizedContext = { tenantId: orgA, userId: userA, actorKind: "model" };
  let matterId = "";

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "patent-invention-"));
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
        title: "Spending",
        idea: "Control a shared spending allowance across AI workers that can clone, delegate tasks and retry operations.",
      })
    ).id;
    const store = localObjectStore(dir);
    for (const [name, text] of [
      ["supplied.txt", supplied],
      ["question.txt", payment],
    ] as const) {
      const bytes = new TextEncoder().encode(text);
      await ingestArtifact(app, ctxA, {
        matterId,
        filename: name,
        mediaType: "text/plain",
        bytes,
        claimedSha256: sha256Hex(bytes),
        store,
      });
    }
  });

  afterAll(async () => {
    await owner.delete(schema.matters).where(eq(schema.matters.tenantId, orgA));
    await owner.delete(schema.organization).where(eq(schema.organization.id, orgA));
    await owner.delete(schema.organization).where(eq(schema.organization.id, orgB));
    await owner.delete(schema.user).where(eq(schema.user.id, userA));
    await owner.delete(schema.user).where(eq(schema.user.id, userB));
    await appPool?.end();
    await ownerPool?.end();
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("asks about the payment timeout and does not invent a mechanism", async () => {
    const result = await extractInvention(app, ctxA, matterId, {});
    expect(result).toMatchObject({ status: "provider_unavailable", route: "not_configured" });
    const view = await getInvention(app, ctxA, matterId);
    const paymentQuestion = view?.questions.find(
      (question) => question.affectedFeature === "payment outcome",
    );
    expect(paymentQuestion?.text).toBe(payment);
    expect(view?.elements.some((element) => element.text.includes("Root authority ledger"))).toBe(
      false,
    );
    expect(view?.elements.some((element) => element.classification === "supplied_fact")).toBe(true);
    expect(view?.analyses[0]?.status).toBe("current");
    expect(await getInvention(app, ctxB, matterId)).toBeNull();
  });

  it("records an answer and marks the analysis stale", async () => {
    const before = await getInvention(app, ctxA, matterId);
    const question = before?.questions.find((row) => row.affectedFeature === "payment outcome");
    expect(question).toBeTruthy();
    const saved = await answerInventionQuestion(app, ctxA, {
      matterId,
      questionId: question?.id ?? "",
      text: "The provider result is unknown until a reconciliation record arrives.",
      expectedRevision: before?.revision ?? 0,
    });
    const after = await getInvention(app, ctxA, matterId);
    expect(after?.revision).toBe(saved.revision);
    expect(after?.analyses.every((row) => row.status === "stale")).toBe(true);
    const answer = after?.answers.find((row) => row.questionId === question?.id);
    expect(answer?.answeredAt.toISOString()).toBe(saved.answeredAt);
  });

  it("accepts a model suggestion without an invention date or inventorship", async () => {
    const before = await getInvention(app, ctxA, matterId);
    const [suggestion] = await owner
      .insert(schema.mechanismSuggestions)
      .values({
        tenantId: orgA,
        matterId,
        text: "Retain the reservation until reconciliation.",
        classification: "proposed_embodiment",
        proposedByKind: "model",
        inventorship: "unresolved",
      })
      .returning();
    expect(suggestion).toBeTruthy();
    await expect(
      acceptMechanismSuggestion(app, modelA, {
        matterId,
        suggestionId: suggestion?.id ?? "",
        expectedRevision: before?.revision ?? 0,
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
    await expect(
      setRunBudget(app, modelA, matterId, "999", before?.revision ?? 0),
    ).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
    });
    const accepted = await acceptMechanismSuggestion(app, ctxA, {
      matterId,
      suggestionId: suggestion?.id ?? "",
      expectedRevision: before?.revision ?? 0,
    });
    const [row] = await withTenant(app, ctxA, (tx) =>
      tx
        .select()
        .from(schema.mechanismSuggestions)
        .where(eq(schema.mechanismSuggestions.id, suggestion?.id ?? "")),
    );
    expect(row?.inventionDate).toBeNull();
    expect(row?.inventorship).toBe("unresolved");
    expect(row?.classification).toBe("proposed_embodiment");
    expect(row?.proposedByKind).toBe("model");
    expect(row?.acceptedAt?.toISOString()).toBe(accepted.acceptedAt);
    const [assertion] = await withTenant(app, ctxA, (tx) =>
      tx
        .select()
        .from(schema.assertions)
        .where(eq(schema.assertions.text, "Retain the reservation until reconciliation.")),
    );
    expect(assertion?.classification).toBe("proposed_embodiment");
    expect(assertion?.proposedByKind).toBe("model");
  });

  it("writes a development task for a vague idea", async () => {
    const id = (
      await createMatter(app, ctxA, {
        title: "Vague",
        idea: "Improve things",
      })
    ).id;
    await extractInvention(app, ctxA, id, {});
    const view = await getInvention(app, ctxA, id);
    expect(view?.tasks.length).toBeGreaterThan(0);
    expect(view?.elements).toEqual([]);
    expect(view?.extractions[0]?.status).toBe("provider_unavailable");
  });
});
