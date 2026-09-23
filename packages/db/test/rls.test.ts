import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Database, schema, withTenant } from "../src/index.js";

/**
 * S01 acceptance: a matter created by one tenant cannot be read or written by
 * another tenant — enforced by Postgres RLS running as the non-owner app role.
 */

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;

const run = appUrl && migUrl ? describe : describe.skip;

run("tenant isolation (RLS, app role)", () => {
  let app: Database;
  let owner: Database;
  let appPool: pg.Pool;
  let ownerPool: pg.Pool;

  const orgA = `org_${randomUUID()}`;
  const orgB = `org_${randomUUID()}`;
  const userA = `user_${randomUUID()}`;
  const userB = `user_${randomUUID()}`;
  let matterAId = "";

  beforeAll(async () => {
    ({ db: app, pool: appPool } = createDb(appUrl as string));
    ({ db: owner, pool: ownerPool } = createDb(migUrl as string));

    // Seed identity fixtures (auth tables have no RLS) with the owner role.
    await owner.insert(schema.organization).values([
      { id: orgA, name: "Tenant A" },
      { id: orgB, name: "Tenant B" },
    ]);
    await owner.insert(schema.user).values([
      { id: userA, name: "User A", email: `${userA}@example.test` },
      { id: userB, name: "User B", email: `${userB}@example.test` },
    ]);
  });

  afterAll(async () => {
    // Clean up via owner (bypasses RLS). Cascades remove acl/assertions.
    if (matterAId) {
      await owner.delete(schema.matters).where(eq(schema.matters.id, matterAId));
    }
    await owner.delete(schema.organization).where(eq(schema.organization.id, orgA));
    await owner.delete(schema.organization).where(eq(schema.organization.id, orgB));
    await owner.delete(schema.user).where(eq(schema.user.id, userA));
    await owner.delete(schema.user).where(eq(schema.user.id, userB));
    await appPool?.end();
    await ownerPool?.end();
  });

  it("connects as the non-owner application role", async () => {
    const res = await appPool.query<{ current_user: string }>("select current_user");
    expect(res.rows[0]?.current_user).toBe("patent_app_rls");
  });

  it("tenant A can create a private matter (matter + owner ACL + initial idea assertion)", async () => {
    const matter = await withTenant(app, { tenantId: orgA, userId: userA }, async (tx) => {
      const [m] = await tx
        .insert(schema.matters)
        .values({ tenantId: orgA, title: "Confidential Matter A", createdBy: userA })
        .returning();
      await tx
        .insert(schema.matterAcl)
        .values({ tenantId: orgA, matterId: m.id, principalId: userA, role: "owner" });
      await tx.insert(schema.assertions).values({
        tenantId: orgA,
        matterId: m.id,
        text: "Initial idea supplied by the inventor.",
        classification: "supplied_fact",
        proposedByKind: "person",
        proposedById: userA,
      });
      return m;
    });
    matterAId = matter.id;
    expect(matter.id).toBeTruthy();
  });

  it("tenant A can read its own matter", async () => {
    const rows = await withTenant(app, { tenantId: orgA, userId: userA }, (tx) =>
      tx.select().from(schema.matters).where(eq(schema.matters.id, matterAId)),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe("Confidential Matter A");
  });

  it("tenant B cannot READ tenant A's matter", async () => {
    const rows = await withTenant(app, { tenantId: orgB, userId: userB }, (tx) =>
      tx.select().from(schema.matters).where(eq(schema.matters.id, matterAId)),
    );
    expect(rows).toHaveLength(0);
  });

  it("tenant B cannot READ tenant A's assertions (confidential idea text)", async () => {
    const rows = await withTenant(app, { tenantId: orgB, userId: userB }, (tx) =>
      tx.select().from(schema.assertions).where(eq(schema.assertions.matterId, matterAId)),
    );
    expect(rows).toHaveLength(0);
  });

  it("tenant B UPDATE of tenant A's matter affects 0 rows (RLS hides it)", async () => {
    const updated = await withTenant(app, { tenantId: orgB, userId: userB }, (tx) =>
      tx
        .update(schema.matters)
        .set({ title: "hijacked" })
        .where(eq(schema.matters.id, matterAId))
        .returning(),
    );
    expect(updated).toHaveLength(0);
  });

  it("tenant B cannot escalate by inserting an ACL for tenant A's matter", async () => {
    // Attempt with tenant B's own tenant id: composite FK has no such matter.
    await expect(
      withTenant(app, { tenantId: orgB, userId: userB }, (tx) =>
        tx
          .insert(schema.matterAcl)
          .values({ tenantId: orgB, matterId: matterAId, principalId: userB, role: "owner" }),
      ),
    ).rejects.toThrow();

    // Attempt spoofing tenant A's id: RLS WITH CHECK rejects it.
    await expect(
      withTenant(app, { tenantId: orgB, userId: userB }, (tx) =>
        tx
          .insert(schema.matterAcl)
          .values({ tenantId: orgA, matterId: matterAId, principalId: userB, role: "owner" }),
      ),
    ).rejects.toThrow();
  });

  it("tenant B cannot write a source/assertion into tenant A's matter", async () => {
    await expect(
      withTenant(app, { tenantId: orgB, userId: userB }, (tx) =>
        tx.insert(schema.assertions).values({
          tenantId: orgA,
          matterId: matterAId,
          text: "cross-tenant leak attempt",
          classification: "supplied_fact",
          proposedByKind: "person",
          proposedById: userB,
        }),
      ),
    ).rejects.toThrow();
  });

  it("no tenant context = default deny (0 rows)", async () => {
    const rows = await app.select().from(schema.matters).where(eq(schema.matters.id, matterAId));
    expect(rows).toHaveLength(0);
  });
});
