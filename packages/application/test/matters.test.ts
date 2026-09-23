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
  listMatters,
  revokeMatterMember,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

run("matter services (authorization + tenant isolation)", () => {
  let app: Database;
  let owner: Database;
  let appPool: pg.Pool;
  let ownerPool: pg.Pool;

  const orgA = `org_${randomUUID()}`;
  const orgB = `org_${randomUUID()}`;
  const userA = `user_${randomUUID()}`; // member of orgA
  const userB = `user_${randomUUID()}`; // member of orgB
  const userC = `user_${randomUUID()}`; // member of orgA (collaborator)

  const ctxA: AuthorizedContext = { tenantId: orgA, userId: userA };
  const ctxB: AuthorizedContext = { tenantId: orgB, userId: userB };
  const ctxC: AuthorizedContext = { tenantId: orgA, userId: userC };

  let matterId = "";

  beforeAll(async () => {
    ({ db: app, pool: appPool } = createDb(appUrl as string));
    ({ db: owner, pool: ownerPool } = createDb(migUrl as string));

    await owner.insert(schema.organization).values([
      { id: orgA, name: "Org A" },
      { id: orgB, name: "Org B" },
    ]);
    await owner.insert(schema.user).values([
      { id: userA, name: "A", email: `${userA}@e.test` },
      { id: userB, name: "B", email: `${userB}@e.test` },
      { id: userC, name: "C", email: `${userC}@e.test` },
    ]);
    await owner.insert(schema.member).values([
      { id: randomUUID(), organizationId: orgA, userId: userA, role: "owner" },
      { id: randomUUID(), organizationId: orgB, userId: userB, role: "owner" },
      { id: randomUUID(), organizationId: orgA, userId: userC, role: "member" },
    ]);
  });

  afterAll(async () => {
    if (matterId) await owner.delete(schema.matters).where(eq(schema.matters.id, matterId));
    for (const id of [orgA, orgB]) {
      await owner.delete(schema.organization).where(eq(schema.organization.id, id));
    }
    for (const id of [userA, userB, userC]) {
      await owner.delete(schema.user).where(eq(schema.user.id, id));
    }
    await appPool?.end();
    await ownerPool?.end();
  });

  it("member can create a private matter with the idea stored as an assertion", async () => {
    const { id } = await createMatter(app, ctxA, {
      title: "Bounded agent spending authority",
      idea: "Control a shared spending allowance across AI workers that can clone.",
    });
    matterId = id;
    const loaded = await getMatter(app, ctxA, id);
    expect(loaded?.matter.title).toBe("Bounded agent spending authority");
    expect(loaded?.assertions.some((a) => a.classification === "supplied_fact")).toBe(true);
  });

  it("non-member cannot create a matter in the organization", async () => {
    // userB is not a member of orgA.
    await expect(
      createMatter(app, { tenantId: orgA, userId: userB }, { title: "x", idea: "y" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("input validation rejects an empty idea", async () => {
    await expect(createMatter(app, ctxA, { title: "no idea", idea: "" })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  it("owner sees the matter in the list; other tenant does not", async () => {
    const listA = await listMatters(app, ctxA);
    const listB = await listMatters(app, ctxB);
    expect(listA.some((m) => m.id === matterId)).toBe(true);
    expect(listB.some((m) => m.id === matterId)).toBe(false);
  });

  it("cross-tenant getMatter returns null", async () => {
    expect(await getMatter(app, ctxB, matterId)).toBeNull();
  });

  it("collaborator gains access when granted, and loses it when revoked", async () => {
    // Before grant: no access.
    expect(await getMatter(app, ctxC, matterId)).toBeNull();
    // Grant.
    await addMatterMember(app, ctxA, matterId, userC, "editor");
    const afterGrant = await getMatter(app, ctxC, matterId);
    expect(afterGrant?.matter.id).toBe(matterId);
    // Revoke.
    await revokeMatterMember(app, ctxA, matterId, userC);
    expect(await getMatter(app, ctxC, matterId)).toBeNull();
  });

  it("a user from another tenant cannot grant themselves access", async () => {
    await expect(addMatterMember(app, ctxB, matterId, userB, "owner")).rejects.toThrow();
    expect(await getMatter(app, ctxB, matterId)).toBeNull();
  });
});
