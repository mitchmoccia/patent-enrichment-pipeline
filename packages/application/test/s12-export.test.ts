import { randomUUID } from "node:crypto";
import { createDb, type Database, schema } from "@patent/db";
import { eq } from "drizzle-orm";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type AuthorizedContext,
  buildExport,
  createMatter,
  evaluateGates,
  getExport,
  saveFigure,
  saveSection,
} from "../src/index.js";

const appUrl = process.env.DATABASE_URL;
const migUrl = process.env.DATABASE_MIGRATION_URL;
const run = appUrl && migUrl ? describe : describe.skip;

async function sections(
  app: Database,
  ctx: AuthorizedContext,
  matterId: string,
  description: string,
) {
  await saveFigure(app, ctx, {
    matterId,
    numeral: "1",
    label: "ledger",
    description: "A ledger of timeouts.",
  });
  await saveSection(app, ctx, {
    matterId,
    kind: "abstract",
    text: "A worker records a timeout.",
    hypothetical: false,
    evidenceNote: null,
  });
  await saveSection(app, ctx, {
    matterId,
    kind: "description",
    text: description,
    hypothetical: false,
    evidenceNote: null,
  });
  await saveSection(app, ctx, {
    matterId,
    kind: "claims",
    text: "1. A method that records a timeout.",
    hypothetical: false,
    evidenceNote: "The worker recorded the timeout count.",
  });
}

run("S12 export", () => {
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
      await createMatter(app, ctxA, { title: "Export", idea: "A worker records a timeout." })
    ).id;
    await sections(app, ctxA, matterId, "Figure 1 shows a ledger.");
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

  it("rejects hidden comments, orphan figures, and leaked metadata", async () => {
    const hidden = (
      await createMatter(app, ctxA, { title: "Hidden", idea: "A worker records a timeout." })
    ).id;
    await sections(app, ctxA, hidden, "Figure 1 shows a ledger. <!-- note -->");
    await expect(buildExport(app, ctxA, hidden)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "hidden_comment",
    });
    const orphan = (
      await createMatter(app, ctxA, { title: "Orphan", idea: "A worker records a timeout." })
    ).id;
    await saveSection(app, ctxA, {
      matterId: orphan,
      kind: "abstract",
      text: "A worker records a timeout.",
      hypothetical: false,
      evidenceNote: null,
    });
    await saveSection(app, ctxA, {
      matterId: orphan,
      kind: "claims",
      text: "1. A method that records a timeout.",
      hypothetical: false,
      evidenceNote: "The worker recorded the timeout count.",
    });
    await owner.insert(schema.specificationSections).values({
      tenantId: orgA,
      matterId: orphan,
      kind: "description",
      text: "Figure 4 shows a ledger.",
    });
    await expect(buildExport(app, ctxA, orphan)).rejects.toMatchObject({
      message: "orphan_figure",
    });
    const leaked = (
      await createMatter(app, ctxA, { title: "Leaked", idea: "A worker records a timeout." })
    ).id;
    await sections(app, ctxA, leaked, "Figure 1 shows a ledger.");
    await saveSection(app, ctxA, {
      matterId: leaked,
      kind: "abstract",
      text: "mail me at a@b.co",
      hypothetical: false,
      evidenceNote: null,
    });
    await expect(buildExport(app, ctxA, leaked)).rejects.toMatchObject({
      message: "metadata_leakage",
    });
    const missing = (
      await createMatter(app, ctxA, { title: "Missing", idea: "A worker records a timeout." })
    ).id;
    await expect(buildExport(app, ctxA, missing)).rejects.toMatchObject({
      message: "missing_clause",
    });
  });

  it("keeps the package unexecuted and drops it when the text or the link changes", async () => {
    const built = await buildExport(app, ctxA, matterId);
    expect(built.unexecuted).toBe(true);
    expect(built.matterState).not.toBe("filed");
    expect(built.matterState).not.toBe("granted_recorded");
    expect(built.portalRendering).toBe("filer_must_inspect");
    const current = await getExport(app, ctxA, matterId);
    expect(current?.status).toBe("current");
    if (current?.status === "current") {
      expect(current.files.find((file) => file.name === "form.txt")?.text).toMatch(/UNEXECUTED/);
      expect(current.pdfStatus).toBe("review_rendering_unavailable");
    }
    const gates = await evaluateGates(app, ctxA, matterId);
    expect(gates.find((gate) => gate.gateId === "G12")?.outcome).toBe("needs_review");
    expect(await getExport(app, ctxB, matterId)).toBeNull();

    await saveSection(app, ctxA, {
      matterId,
      kind: "abstract",
      text: "A worker records a timeout and a retry.",
      hypothetical: false,
      evidenceNote: null,
    });
    expect((await getExport(app, ctxA, matterId))?.status).toBe("stale");

    await saveSection(app, ctxA, {
      matterId,
      kind: "abstract",
      text: "A worker records a timeout.",
      hypothetical: false,
      evidenceNote: null,
    });
    const again = await buildExport(app, ctxA, matterId);
    await owner
      .update(schema.exportManifests)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(schema.exportManifests.id, again.manifest.id));
    expect((await getExport(app, ctxA, matterId))?.status).toBe("expired");
    const [matter] = await owner
      .select()
      .from(schema.matters)
      .where(eq(schema.matters.id, matterId));
    expect(matter?.state).toBe("intake");
  });
});
