import { randomUUID } from "node:crypto";
import { createDb, type Database, schema } from "@patent/db";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  createMatter,
  getAlternatives,
  proposeAlternative,
  selectAlternative,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

run("S09 alternatives", () => {
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
      await createMatter(app, ctxA, {
        title: "Alternatives",
        idea: "Keep a durable reservation when a worker is partitioned.",
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

  it("keeps model proposals out of the disclosure and ranks an unexplained benefit loss", async () => {
    const dropped = await proposeAlternative(app, ctxA, {
      matterId,
      label: "Drop the reservation",
      origin: "model",
      removesBenefit: "durable reservation",
      explanation: null,
      partitionTolerant: false,
      consistencyAssumption: null,
      feasibility: "unknown",
    });
    expect(dropped.rank).toBe("not_equivalent");
    expect(dropped.inSelectedDisclosure).toBe(false);
    expect(dropped.experimentStatus).toBe("unavailable");
    expect(dropped.feasibility).toBe("unknown");
    await expect(
      selectAlternative(app, ctxA, { matterId, alternativeId: dropped.id }),
    ).rejects.toMatchObject({
      code: "POLICY_BLOCKED",
    });
    await expect(
      proposeAlternative(app, ctxA, {
        matterId,
        label: "Partitioned ledger",
        origin: "person",
        removesBenefit: null,
        explanation: null,
        partitionTolerant: true,
        consistencyAssumption: null,
        feasibility: "plausible",
      }),
    ).rejects.toMatchObject({ code: "POLICY_BLOCKED" });
    const human = await proposeAlternative(app, ctxA, {
      matterId,
      label: "Local queue",
      origin: "person",
      removesBenefit: null,
      explanation: "The reservation remains durable.",
      partitionTolerant: true,
      consistencyAssumption: "A partition heals before a second spend is allowed.",
      feasibility: "plausible",
    });
    const selected = await selectAlternative(app, ctxA, { matterId, alternativeId: human.id });
    expect(selected.inSelectedDisclosure).toBe(true);
    expect(await getAlternatives(app, ctxB, matterId)).toBeNull();
  });
});
