import { randomUUID } from "node:crypto";
import { createDb, type Database, schema } from "@patent/db";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  addLimitation,
  approveGate,
  createMatter,
  evaluateGates,
  getGates,
  importReference,
  patchClaim,
  recordFinding,
  releasePackage,
  saveClaim,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

run("S11 gates", () => {
  let app: Database;
  let owner: Database;
  let appPool: pg.Pool;
  let ownerPool: pg.Pool;
  const orgA = `org_${randomUUID()}`;
  const orgB = `org_${randomUUID()}`;
  const userA = `user_${randomUUID()}`;
  const userB = `user_${randomUUID()}`;
  const ctxA: AuthorizedContext = { tenantId: orgA, userId: userA, actorKind: "person" };
  const modelA: AuthorizedContext = { tenantId: orgA, userId: userA, actorKind: "model" };
  const ctxB: AuthorizedContext = { tenantId: orgB, userId: userB, actorKind: "person" };
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
      await createMatter(app, ctxA, { title: "Gates", idea: "A worker records a timeout." })
    ).id;
    await owner.insert(schema.inventionAnalyses).values({
      tenantId: orgA,
      matterId,
      snapshotRevision: 0,
      status: "current",
      subject: "mechanism",
    });
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

  it("keeps a model from approving and drops a release when the claim changes", async () => {
    await expect(approveGate(app, modelA, { matterId, gateId: "G13" })).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
    });
    await expect(
      releasePackage(app, ctxA, {
        matterId,
        requestedCapacity: "patent_attorney",
        recordedCapacity: "administrator",
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
    const claim = await saveClaim(app, ctxA, {
      matterId,
      category: "method",
      dependsOn: null,
      connective: "and",
      limitations: [{ text: "records a timeout", actor: "worker" }],
    });
    await evaluateGates(app, ctxA, matterId);
    const released = await releasePackage(app, ctxA, {
      matterId,
      requestedCapacity: "inventor",
      recordedCapacity: "inventor",
    });
    expect((await getGates(app, ctxA, matterId))?.releaseCoversPackage).toBe(true);
    await patchClaim(app, ctxA, {
      matterId,
      claimId: claim.id,
      expectedRevision: claim.revision,
      connective: "or",
    });
    const after = await getGates(app, ctxA, matterId);
    expect(after?.releaseCoversPackage).toBe(false);
    expect(after?.gates.find((gate) => gate.gateId === "G08")?.outcome).toBe("stale");
    expect(after?.packageDigest).not.toBe(released.packageDigest);
    const [analysis] = await owner
      .select()
      .from(schema.inventionAnalyses)
      .where(eq(schema.inventionAnalyses.matterId, matterId));
    expect(analysis?.status).toBe("stale");
    expect(await getGates(app, ctxB, matterId)).toBeNull();
  });

  it("fails a fabricated citation that models agreed on", async () => {
    const limitation = await addLimitation(app, ctxA, { matterId, text: "records a timeout" });
    const reference = await importReference(app, ctxA, {
      matterId,
      title: "Worker note",
      publicationDate: "2009-01-01",
      familyDate: null,
      fullText: null,
      passage: "The worker records a timeout.",
    });
    await recordFinding(app, ctxA, {
      matterId,
      limitationId: limitation.id,
      kind: "technical_similarity",
      referenceIds: [reference.id],
      quote: "Root authority ledger",
      motivation: null,
    });
    await evaluateGates(app, ctxA, matterId);
    const view = await getGates(app, ctxA, matterId);
    expect(view?.gates.find((gate) => gate.gateId === "G10")?.outcome).toBe("fail");
    await expect(approveGate(app, ctxA, { matterId, gateId: "G10" })).rejects.toMatchObject({
      code: "GATE_BLOCKED",
    });
  });
});
