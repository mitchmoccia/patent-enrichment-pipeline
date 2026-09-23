import { randomUUID } from "node:crypto";
import { createDb, type Database, schema } from "@patent/db";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  approveWatchPlan,
  createMatter,
  evaluateGates,
  getOperations,
  recordAnalytics,
  sendDemand,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

run("S15 operations", () => {
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
      await createMatter(app, ctxA, { title: "Operations", idea: "A worker records a timeout." })
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

  it("refuses an unapproved watch, confidential analytics, and a demand letter", async () => {
    await expect(
      approveWatchPlan(app, ctxA, {
        matterId,
        source: "uspto",
        cadence: "weekly",
        budgetMicrousd: "10",
        approved: false,
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
    await expect(
      recordAnalytics(app, ctxA, { matterId, properties: { idea: "secret invention" } }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
    await expect(sendDemand()).rejects.toMatchObject({ message: "demand letters are not sent" });
    const view = await getOperations(app, ctxA, matterId);
    expect(view?.health.stripe.entitlements).toBeNull();
    expect(["unconfigured", "configured_unverified"]).toContain(
      view?.health.providers.find((row) => row.name === "stripe")?.status,
    );
    expect(await getOperations(app, ctxB, matterId)).toBeNull();
  });

  it("records an approved watch without starting a demand", async () => {
    const plan = await approveWatchPlan(app, ctxA, {
      matterId,
      source: "uspto public applications",
      cadence: "weekly",
      budgetMicrousd: "10",
      approved: true,
    });
    expect(plan.demandLetters).toBe(false);
    const gates = await evaluateGates(app, ctxA, matterId);
    expect(gates.find((gate) => gate.gateId === "G16")?.outcome).toBe("needs_review");
  });
});
