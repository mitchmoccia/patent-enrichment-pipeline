import { randomUUID } from "node:crypto";
import { createDb, type Database, schema } from "@patent/db";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  addContribution,
  addEmbodiment,
  assignFilingDate,
  chooseSelfFiler,
  createMatter,
  getRights,
  promoteRule,
  selectCurrentRule,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

const older = "uspto-ai-inventorship-2024";
const current = "uspto-ai-inventorship-2025";

run("S05 rights and chronology", () => {
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
  let entityId = "";

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
        title: "Individual",
        idea: "A person tracks their own prototype chronology.",
        applicantMode: "individual_self_filer",
      })
    ).id;
    entityId = (
      await createMatter(app, ctxA, {
        title: "Entity",
        idea: "A company tracks assignment obligations separately from inventorship.",
        applicantMode: "entity_applicant",
      })
    ).id;
  });

  afterAll(async () => {
    await owner
      .update(schema.legalSources)
      .set({ reviewStatus: "seeded" })
      .where(eq(schema.legalSources.sourceKey, current));
    await owner.delete(schema.matters).where(eq(schema.matters.tenantId, orgA));
    await owner.delete(schema.organization).where(eq(schema.organization.id, orgA));
    await owner.delete(schema.organization).where(eq(schema.organization.id, orgB));
    await owner.delete(schema.user).where(eq(schema.user.id, userA));
    await owner.delete(schema.user).where(eq(schema.user.id, userB));
    await appPool?.end();
    await ownerPool?.end();
  });

  it("refuses superseded guidance and keeps counsel approval false", async () => {
    await expect(
      selectCurrentRule(app, ctxA, { matterId, sourceKey: older }),
    ).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
    });
    const selected = await selectCurrentRule(app, ctxA, { matterId, sourceKey: current });
    expect(selected.alert).toBe("seeded, not counsel-approved");
    const promoted = await promoteRule(app, ctxA, { matterId, sourceKey: current });
    expect(promoted).toMatchObject({
      counselApproved: false,
      signed: false,
      reviewStatus: "promoted",
      alert: "promoted by a reviewer, not counsel-approved",
    });
    await expect(promoteRule(app, modelA, { matterId, sourceKey: current })).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
    });
    const view = await getRights(app, ctxA, matterId);
    expect(view?.rules.find((rule) => rule.sourceKey === current)?.counselApproved).toBe(false);
    expect(view?.sources.every((source) => source.counselApproved === false)).toBe(true);
    expect(await getRights(app, ctxB, matterId)).toBeNull();
  });

  it("shows a stale alert when a matter still points at superseded guidance", async () => {
    await owner.insert(schema.matterRules).values({
      tenantId: orgA,
      matterId,
      sourceKey: older,
      status: "current",
    });
    const view = await getRights(app, ctxA, matterId);
    const stale = view?.rules.find((rule) => rule.sourceKey === older);
    expect(stale?.alert).toBe("stale");
  });

  it("refuses an earlier filing date for a newer embodiment", async () => {
    const embodiment = await addEmbodiment(app, ctxA, {
      matterId,
      label: "ledger check",
      developedOn: "2024-06-01",
    });
    await expect(
      assignFilingDate(app, ctxA, {
        matterId,
        embodimentId: embodiment.id,
        filingOn: "2020-01-15",
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
    const saved = await assignFilingDate(app, ctxA, {
      matterId,
      embodimentId: embodiment.id,
      filingOn: "2024-06-01",
    });
    expect(saved.filingOn).toBe("2024-06-01");
  });

  it("keeps entity applicants off the self-filer label", async () => {
    await expect(chooseSelfFiler(app, ctxA, entityId)).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
    });
    const chosen = await chooseSelfFiler(app, ctxA, matterId);
    expect(chosen.label).toBe("self-filer");
    const row = await addContribution(app, ctxA, {
      matterId,
      role: "inventor",
      personLabel: "Ada",
      account: userA,
    });
    expect(row.legalInventorship).toBe("unresolved");
  });
});
