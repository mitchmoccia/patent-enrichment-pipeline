import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDb, type Database, schema, withTenant } from "@patent/db";
import { localObjectStore, unconfiguredStore } from "@patent/documents";
import { sha256Hex } from "@patent/security";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  createMatter,
  getArtifact,
  ingestArtifact,
  listArtifacts,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

run("S02 artifact quarantine", () => {
  let app: Database;
  let owner: Database;
  let appPool: pg.Pool;
  let ownerPool: pg.Pool;
  let dir = "";
  const orgA = `org_${randomUUID()}`;
  const orgB = `org_${randomUUID()}`;
  const userA = `user_${randomUUID()}`;
  const userB = `user_${randomUUID()}`;
  const ctxA: AuthorizedContext = { tenantId: orgA, userId: userA, actorKind: "person" };
  const ctxB: AuthorizedContext = { tenantId: orgB, userId: userB, actorKind: "person" };
  let matterId = "";
  let cleanId = "";

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "patent-objects-"));
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
        title: "Evidence",
        idea: "A ledger that does not double-spend.",
      })
    ).id;
  });

  afterAll(async () => {
    if (matterId) await owner.delete(schema.matters).where(eq(schema.matters.id, matterId));
    await owner.delete(schema.organization).where(eq(schema.organization.id, orgA));
    await owner.delete(schema.organization).where(eq(schema.organization.id, orgB));
    await owner.delete(schema.user).where(eq(schema.user.id, userA));
    await owner.delete(schema.user).where(eq(schema.user.id, userB));
    await appPool?.end();
    await ownerPool?.end();
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("stores a text upload on the local driver and keeps the negation", async () => {
    const bytes = new TextEncoder().encode("The system does not duplicate authority.");
    const stored = await ingestArtifact(app, ctxA, {
      matterId,
      filename: "note.txt",
      mediaType: "text/plain",
      bytes,
      claimedSha256: sha256Hex(bytes),
      store: localObjectStore(dir),
    });
    cleanId = stored.id;
    expect(stored.scanStatus).toBe("clean");
    expect(stored.driver).toBe("local-filesystem");
    const loaded = await getArtifact(app, ctxA, stored.id);
    expect(loaded?.artifact.extractedText).toContain("does not");
    expect(loaded?.spans[0]?.excerpt).toContain("does not");
    const object = await localObjectStore(dir).get(loaded?.artifact.objectKey ?? "");
    expect(object).not.toBeNull();
  });

  it("records a hash mismatch without storing bytes", async () => {
    const bytes = new TextEncoder().encode("hello");
    const store = localObjectStore(dir);
    const rejected = await ingestArtifact(app, ctxA, {
      matterId,
      filename: "bad.txt",
      mediaType: "text/plain",
      bytes,
      claimedSha256: "ab".repeat(32),
      store,
    });
    expect(rejected.scanStatus).toBe("rejected");
    expect(rejected.driver).toBe("none");
    expect(rejected.detail).toMatch(/HASH_MISMATCH/);
    const loaded = await getArtifact(app, ctxA, rejected.id);
    expect(loaded?.artifact.objectKey).toBe("");
    expect(loaded?.artifact.extractedText).toBeNull();
  });

  it("does not report success when object storage is unconfigured", async () => {
    const bytes = new TextEncoder().encode("pending");
    await expect(
      ingestArtifact(app, ctxA, {
        matterId,
        filename: "pending.txt",
        mediaType: "text/plain",
        bytes,
        claimedSha256: sha256Hex(bytes),
        store: unconfiguredStore("S3 is not configured. No object was uploaded."),
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    const rows = await listArtifacts(app, ctxA, matterId);
    expect(rows.some((row) => row.originalName === "pending.txt")).toBe(false);
  });

  it("hides the artifact from another tenant", async () => {
    expect(await getArtifact(app, ctxB, cleanId)).toBeNull();
  });

  it("refuses to rewrite extracted text", async () => {
    try {
      await withTenant(app, ctxA, (tx) =>
        tx
          .update(schema.artifacts)
          .set({ extractedText: "The system does duplicate authority." })
          .where(eq(schema.artifacts.id, cleanId)),
      );
      expect.fail("update should have been rejected");
    } catch (error) {
      const cause = error instanceof Error ? String(error.cause ?? error.message) : String(error);
      expect(cause).toMatch(/immutable/);
    }
    const loaded = await getArtifact(app, ctxA, cleanId);
    expect(loaded?.artifact.extractedText).toContain("does not");
  });
});
