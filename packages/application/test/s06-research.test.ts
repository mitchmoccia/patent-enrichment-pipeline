import { randomUUID } from "node:crypto";
import { createDb, type Database, schema } from "@patent/db";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  createMatter,
  getResearch,
  importReference,
  searchMatter,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

run("S06 research adapters", () => {
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
        title: "Search",
        idea: "Find what was actually published about a worker payment timeout.",
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

  it("keeps unavailable full text empty and does not use a family date", async () => {
    const imported = await importReference(app, ctxA, {
      matterId,
      title: "Worker payment timeout",
      publicationDate: "2010-04-01",
      familyDate: "2001-01-01",
      fullText: null,
      passage: "The publication discusses a worker payment timeout.",
    });
    expect(imported.fullText).toBeNull();
    expect(imported.disclosureDate).toBe("2010-04-01");
    expect(imported.familyDate).toBe("2001-01-01");
    const found = await searchMatter(
      app,
      ctxA,
      { matterId, query: "payment timeout" },
      { USPTO_API_KEY: "expired-token" },
    );
    expect(found.matches[0]?.disclosureDate).toBe("2010-04-01");
    expect(found.matches[0]?.passage).toEqual({ text: null, status: "full_text_unavailable" });
    expect(found.providers.find((item) => item.id === "uspto")).toMatchObject({
      status: "endpoint_unverified",
      matchCount: null,
    });
    expect(found.stopReason).toMatch(/not zero matches/);
    expect(await getResearch(app, ctxB, matterId)).toBeNull();
  });
});
