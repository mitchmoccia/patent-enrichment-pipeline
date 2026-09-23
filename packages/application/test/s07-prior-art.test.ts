import { randomUUID } from "node:crypto";
import { createDb, type Database, schema } from "@patent/db";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  addChronologyEvent,
  addLimitation,
  createMatter,
  getPriorArt,
  importReference,
  recordEligibility,
  recordFinding,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;
const passage = "The worker records a timeout before releasing the reservation.";

run("S07 prior art and eligibility", () => {
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
  let limitationId = "";
  let earlyId = "";
  let lateId = "";

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
        title: "Prior art",
        idea: "A worker records a timeout before releasing a reservation.",
      })
    ).id;
    await addChronologyEvent(app, ctxA, {
      matterId,
      kind: "disclosure",
      precision: "day",
      eventDate: "2010-01-01",
      note: "External disclosure of the timeout record.",
    });
    limitationId = (await addLimitation(app, ctxA, { matterId, text: "records a timeout" })).id;
    earlyId = (
      await importReference(app, ctxA, {
        matterId,
        title: "Early worker",
        publicationDate: "2009-01-01",
        familyDate: "2001-01-01",
        fullText: null,
        passage,
      })
    ).id;
    lateId = (
      await importReference(app, ctxA, {
        matterId,
        title: "Later worker",
        publicationDate: "2022-01-01",
        familyDate: null,
        fullText: passage,
        passage,
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

  it("rejects fabricated, snippet, wrong-date, and unmotivated combination findings", async () => {
    const fabricated = await recordFinding(app, ctxA, {
      matterId,
      limitationId,
      kind: "technical_similarity",
      referenceIds: [earlyId],
      quote: "Root authority ledger",
      motivation: null,
    });
    expect(fabricated).toMatchObject({
      legalStatus: "rejected",
      reason: "fabricated_citation",
      relevance: "not_assessed",
    });
    const snippet = await recordFinding(app, ctxA, {
      matterId,
      limitationId,
      kind: "anticipation",
      referenceIds: [earlyId],
      quote: passage,
      motivation: null,
    });
    expect(snippet.reason).toBe("snippet_only");
    expect(snippet.relevance).toBe("relevant");
    const late = await recordFinding(app, ctxA, {
      matterId,
      limitationId,
      kind: "anticipation",
      referenceIds: [lateId],
      quote: passage,
      motivation: null,
    });
    expect(late.reason).toBe("wrong_date");
    const combination = await recordFinding(app, ctxA, {
      matterId,
      limitationId,
      kind: "obviousness",
      referenceIds: [earlyId, lateId],
      quote: "timeout",
      motivation: null,
    });
    expect(combination.reason).toBe("absent_combination_motivation");
    const distributed = await recordFinding(app, ctxA, {
      matterId,
      limitationId,
      kind: "anticipation",
      referenceIds: [earlyId, lateId],
      quote: "timeout",
      motivation: "ignored for anticipation",
    });
    expect(distributed.reason).toBe("distributed_features");
    await expect(
      recordFinding(app, modelA, {
        matterId,
        limitationId,
        kind: "technical_similarity",
        referenceIds: [earlyId],
        quote: passage,
        motivation: null,
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
  });

  it("rejects a generic eligibility fix and hides the dossier from another tenant", async () => {
    const generic = await recordEligibility(app, ctxA, {
      matterId,
      limitationId,
      answer: "use a processor",
    });
    expect(generic.reason).toBe("generic_eligibility_fix");
    const grounded = await recordEligibility(app, ctxA, {
      matterId,
      limitationId,
      answer: "The worker records a timeout before a retry.",
    });
    expect(grounded.legalStatus).toBe("supported");
    const view = await getPriorArt(app, ctxA, matterId);
    expect(view?.findings.every((finding) => !("successProbability" in finding))).toBe(true);
    expect(view?.limitations[0]?.text).toBe("records a timeout");
    expect(await getPriorArt(app, ctxB, matterId)).toBeNull();
  });
});
