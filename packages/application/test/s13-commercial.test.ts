import { randomUUID } from "node:crypto";
import { createDb, type Database, schema } from "@patent/db";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  createMatter,
  evaluateGates,
  getClaims,
  getCommercial,
  recordCommercial,
  saveClaim,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

run("S13 commercial", () => {
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
      await createMatter(app, ctxA, { title: "Commercial", idea: "A worker records a timeout." })
    ).id;
    await saveClaim(app, ctxA, {
      matterId,
      category: "method",
      dependsOn: null,
      connective: "and",
      limitations: [{ text: "records a timeout", actor: "worker" }],
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

  it("rejects an unsupported licensing probability", async () => {
    await expect(
      recordCommercial(app, ctxA, {
        matterId,
        buyer: "operations lead",
        substitute: "a shared spreadsheet",
        evidenceRequest: "ask what they pay now",
        strategy: "licensing_or_sale",
        decision: "defer",
        productRevenueMicrousd: null,
        productCostMicrousd: null,
        patentCostMicrousd: null,
        marketSizeMicrousd: null,
        licensingProbability: "0.4",
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
  });

  it("records a stop decision without erasing the claim", async () => {
    const row = await recordCommercial(app, ctxA, {
      matterId,
      buyer: null,
      substitute: "a shared spreadsheet",
      evidenceRequest: "ask what they pay now",
      strategy: "defensive",
      decision: "stop",
      productRevenueMicrousd: "100",
      productCostMicrousd: "40",
      patentCostMicrousd: "10",
      marketSizeMicrousd: null,
      licensingProbability: null,
    });
    expect(row.decision).toBe("stop");
    expect(row.productCashflowMicrousd).toBe("60");
    expect(row.incrementalPatentValueMicrousd).toBeNull();
    expect(row.unknowns).toContain("market_size");
    const claims = await getClaims(app, ctxA, matterId);
    expect(claims?.claims).toHaveLength(1);
    const gates = await evaluateGates(app, ctxA, matterId);
    expect(gates.find((gate) => gate.gateId === "G11")?.outcome).toBe("needs_review");
    expect(await getCommercial(app, ctxB, matterId)).toBeNull();
  });
});
