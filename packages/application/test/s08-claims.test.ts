import { randomUUID } from "node:crypto";
import { createDb, type Database, schema } from "@patent/db";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  addEmbodiment,
  createMatter,
  getClaims,
  linkClaimSupport,
  markEmbodimentConflict,
  patchClaim,
  saveClaim,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

run("S08 claim support", () => {
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
      await createMatter(app, ctxA, { title: "Claims", idea: "A worker records a timeout." })
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

  it("invalidates support when scope changes and rejects incompatible embodiments", async () => {
    const parent = await saveClaim(app, ctxA, {
      matterId,
      category: "method",
      dependsOn: null,
      connective: "and",
      limitations: [
        { text: "records a timeout", actor: "worker" },
        { text: "keeps the reservation", actor: "worker" },
      ],
    });
    await expect(
      saveClaim(app, ctxA, {
        matterId,
        category: "system",
        dependsOn: parent.id,
        connective: "and",
        limitations: [{ text: "a stored record", actor: null }],
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
    const child = await saveClaim(app, ctxA, {
      matterId,
      category: "method",
      dependsOn: parent.id,
      connective: "and",
      limitations: [{ text: "a stored record", actor: null }],
    });
    await expect(
      patchClaim(app, ctxA, {
        matterId,
        claimId: parent.id,
        expectedRevision: parent.revision,
        dependsOn: child.id,
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
    const widened = await patchClaim(app, ctxA, {
      matterId,
      claimId: parent.id,
      expectedRevision: parent.revision,
      connective: "or",
    });
    expect(widened.supportStatus).toBe("stale");
    await expect(
      patchClaim(app, ctxA, {
        matterId,
        claimId: parent.id,
        expectedRevision: parent.revision,
        connective: "and",
      }),
    ).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    const deleted = await patchClaim(app, ctxA, {
      matterId,
      claimId: parent.id,
      expectedRevision: widened.revision,
      limitations: [parent.limitations[0] as { id: string; text: string; actor: string | null }],
    });
    expect(deleted.removed).toHaveLength(1);
    expect(deleted.supportStatus).toBe("stale");
    await expect(
      saveClaim(app, ctxA, {
        matterId,
        category: "method",
        dependsOn: null,
        connective: "and",
        limitations: [{ text: "at least one and exactly zero reservations", actor: null }],
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
    const left = await addEmbodiment(app, ctxA, {
      matterId,
      label: "strict",
      developedOn: "2024-01-01",
    });
    const right = await addEmbodiment(app, ctxA, {
      matterId,
      label: "loose",
      developedOn: "2024-02-01",
    });
    await markEmbodimentConflict(app, ctxA, {
      matterId,
      leftEmbodimentId: left.id,
      rightEmbodimentId: right.id,
    });
    const limitationId = (deleted.limitations[0] as { id: string }).id;
    await linkClaimSupport(app, ctxA, {
      matterId,
      claimId: parent.id,
      limitationId,
      embodimentId: left.id,
    });
    await expect(
      linkClaimSupport(app, ctxA, {
        matterId,
        claimId: parent.id,
        limitationId,
        embodimentId: right.id,
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
    expect(await getClaims(app, ctxB, matterId)).toBeNull();
  });
});
