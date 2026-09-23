import { randomUUID } from "node:crypto";
import { createDb, type Database, schema } from "@patent/db";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  addMatterMember,
  createMatter,
  getMatter,
  recordProcessingPolicy,
  revokeMatterMember,
  routeHandlerRevokeMember,
  routeHandlerUpdateGoal,
  serverActionRevokeMember,
  serverActionUpdateGoal,
  setRunBudget,
  updateMatterGoal,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

run("S01 residual: goal, policy, budget, MFA gate, revoked transports", () => {
  let app: Database;
  let owner: Database;
  let appPool: pg.Pool;
  let ownerPool: pg.Pool;
  const orgA = `org_${randomUUID()}`;
  const userA = `user_${randomUUID()}`;
  const userC = `user_${randomUUID()}`;
  const ctxA: AuthorizedContext = { tenantId: orgA, userId: userA, actorKind: "person" };
  const ctxC: AuthorizedContext = { tenantId: orgA, userId: userC, actorKind: "person" };
  const modelCtx: AuthorizedContext = { tenantId: orgA, userId: userA, actorKind: "model" };
  let matterId = "";

  beforeAll(async () => {
    ({ db: app, pool: appPool } = createDb(appUrl as string));
    ({ db: owner, pool: ownerPool } = createDb(migUrl as string));
    await owner.insert(schema.organization).values({ id: orgA, name: "Org A" });
    await owner.insert(schema.user).values([
      { id: userA, name: "A", email: `${userA}@e.test` },
      { id: userC, name: "C", email: `${userC}@e.test` },
    ]);
    await owner.insert(schema.member).values([
      { id: randomUUID(), organizationId: orgA, userId: userA, role: "owner" },
      { id: randomUUID(), organizationId: orgA, userId: userC, role: "member" },
    ]);
  });

  afterAll(async () => {
    if (matterId) await owner.delete(schema.matters).where(eq(schema.matters.id, matterId));
    await owner.delete(schema.organization).where(eq(schema.organization.id, orgA));
    await owner.delete(schema.user).where(eq(schema.user.id, userA));
    await owner.delete(schema.user).where(eq(schema.user.id, userC));
    await appPool?.end();
    await ownerPool?.end();
  });

  it("stores a processing policy and run budget on the matter", async () => {
    const created = await createMatter(app, ctxA, {
      title: "Policy matter",
      idea: "A ledger that does not duplicate a copied balance.",
      goal: "Assess supported scope",
      runBudgetMicrousd: "25000000",
      processingPolicy: {
        id: randomUUID(),
        version: "1",
        allowedProviderRouteIds: [],
        allowedSourceAdapterIds: [],
        allowedRegions: ["us"],
        confidentialEgressAllowed: false,
        trainingUseAllowed: false,
        retentionPolicyId: "local-dev",
        dataAgreementRefs: [],
        budgetCapMicrousd: "25000000",
        approvalActorId: userA,
        approvedAt: new Date().toISOString(),
      },
    });
    matterId = created.id;
    const loaded = await getMatter(app, ctxA, matterId);
    expect(loaded?.matter.runBudgetMicrousd).toBe("25000000");
    expect(loaded?.matter.processingPolicy).toMatchObject({ trainingUseAllowed: false });
  });

  it("rejects a policy that would allow training use", async () => {
    await expect(
      createMatter(app, ctxA, {
        title: "bad",
        idea: "idea",
        processingPolicy: {
          id: "p",
          version: "1",
          allowedProviderRouteIds: [],
          allowedSourceAdapterIds: [],
          allowedRegions: ["us"],
          confidentialEgressAllowed: false,
          trainingUseAllowed: true as unknown as false,
          retentionPolicyId: "local-dev",
          dataAgreementRefs: [],
          budgetCapMicrousd: "1",
          approvalActorId: userA,
          approvedAt: new Date().toISOString(),
        },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("lets the owner edit the goal and records a successor snapshot", async () => {
    const saved = await updateMatterGoal(app, ctxA, {
      matterId,
      goal: "Keep a defensible fallback if the broad claim fails",
      expectedRevision: 0,
    });
    expect(saved.revision).toBe(1);
    const loaded = await getMatter(app, ctxA, matterId);
    expect(loaded?.matter.goal).toContain("fallback");
    expect(loaded?.matter.headRevision).toBe(1);
  });

  it("a model cannot raise the run budget", async () => {
    await expect(setRunBudget(app, modelCtx, matterId, "999999999", 1)).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
    });
  });

  it("records a later processing policy without enabling training", async () => {
    const saved = await recordProcessingPolicy(
      app,
      ctxA,
      matterId,
      {
        allowedRegions: ["us"],
        confidentialEgressAllowed: false,
        retentionPolicyId: "local-dev",
        budgetCapMicrousd: "10000000",
      },
      1,
    );
    expect(saved.revision).toBe(2);
    const loaded = await getMatter(app, ctxA, matterId);
    const policy = loaded?.matter.processingPolicy as { trainingUseAllowed?: boolean } | null;
    expect(policy?.trainingUseAllowed).toBe(false);
    expect(loaded?.matter.runBudgetMicrousd).toBe("10000000");
  });

  it("Server Action and Route Handler both reject a session without MFA", async () => {
    await expect(
      serverActionUpdateGoal(app, ctxA, {
        matterId,
        goal: "should not save",
        expectedRevision: 2,
        mfaEnabled: false,
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
    const routed = await routeHandlerUpdateGoal(app, ctxA, {
      matterId,
      goal: "should not save",
      expectedRevision: 2,
      mfaEnabled: false,
    });
    expect(routed.status).toBe(403);
    expect(routed.body).toMatchObject({ code: "POLICY_BLOCKED" });
  });

  it("Server Action and Route Handler both reject a revoked principal", async () => {
    await addMatterMember(app, ctxA, matterId, userC, "editor");
    expect(await getMatter(app, ctxC, matterId)).not.toBeNull();
    await revokeMatterMember(app, ctxA, matterId, userC);
    await expect(
      serverActionRevokeMember(app, ctxC, {
        matterId,
        principalId: userA,
        mfaEnabled: true,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const routed = await routeHandlerRevokeMember(app, ctxC, {
      matterId,
      principalId: userA,
      mfaEnabled: true,
    });
    expect(routed).toEqual({
      status: 403,
      body: { code: "UNAUTHORIZED", message: "revoked or unknown matter" },
    });
    await expect(
      serverActionUpdateGoal(app, ctxC, {
        matterId,
        goal: "revoked edit",
        expectedRevision: 2,
        mfaEnabled: true,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses to revoke the last owner", async () => {
    await expect(revokeMatterMember(app, ctxA, matterId, userA)).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
    });
  });
});
