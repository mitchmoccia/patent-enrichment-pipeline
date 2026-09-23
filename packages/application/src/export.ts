import { type Database, schema, withTenant } from "@patent/db";
import { assembleExport, type ExportFailure } from "@patent/documents";
import { desc, eq } from "drizzle-orm";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { matterDigests } from "./gates";
import { assertHumanActor } from "./human";
import { lockMatter, requireEditor } from "./run-shared";

const linkMinutes = 15;

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

async function requestOf(tx: Tx, matterId: string) {
  const sections = await tx
    .select()
    .from(schema.specificationSections)
    .where(eq(schema.specificationSections.matterId, matterId));
  const figures = await tx
    .select()
    .from(schema.specificationFigures)
    .where(eq(schema.specificationFigures.matterId, matterId));
  const claims = await tx
    .select()
    .from(schema.claimDrafts)
    .where(eq(schema.claimDrafts.matterId, matterId));
  const support = await tx
    .select()
    .from(schema.claimSupport)
    .where(eq(schema.claimSupport.matterId, matterId));
  const ordered = [...claims].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  );
  return assembleExport({
    sections: sections.map((section) => ({ kind: section.kind, text: section.text })),
    figures: figures.map((figure) => ({ numeral: figure.numeral, label: figure.label })),
    claims: ordered.map((claim, index) => ({
      number: index + 1,
      text: claim.limitations.map((limitation) => limitation.text).join(" "),
    })),
    support: support.map((row) => ({ limitation: row.limitationId, status: row.status })),
  });
}

function rejected(reason: ExportFailure): never {
  throw new AppError("VALIDATION_FAILED", reason);
}

export async function buildExport(db: Database, ctx: AuthorizedContext, matterId: string) {
  assertHumanActor(ctx);
  return withTenant(db, ctx, async (tx) => {
    const matter = await lockMatter(tx, matterId);
    await requireEditor(tx, matterId, ctx.userId);
    const assembled = await requestOf(tx, matterId);
    if (!assembled.ok) rejected(assembled.reason);
    const { packageDigest } = await matterDigests(tx, matterId);
    const expiresAt = new Date(Date.now() + linkMinutes * 60 * 1000);
    const [row] = await tx
      .insert(schema.exportManifests)
      .values({
        tenantId: ctx.tenantId,
        matterId,
        packageDigest,
        manifestDigest: assembled.digest,
        files: assembled.files.map((file) => ({ name: file.name, sha256: file.sha256 })),
        pdfStatus: assembled.pdfStatus,
        expiresAt,
      })
      .returning();
    if (!row) throw new AppError("POLICY_BLOCKED", "export was not recorded");
    return {
      manifest: row,
      matterState: matter.state,
      unexecuted: assembled.unexecuted,
      portalRendering: assembled.portalRendering,
    };
  });
}

export async function getExport(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [matter] = await tx.select().from(schema.matters).where(eq(schema.matters.id, matterId));
    if (!matter) return null;
    const [manifest] = await tx
      .select()
      .from(schema.exportManifests)
      .where(eq(schema.exportManifests.matterId, matterId))
      .orderBy(desc(schema.exportManifests.createdAt))
      .limit(1);
    const { packageDigest } = await matterDigests(tx, matterId);
    if (!manifest) return { status: "none" as const, matterState: matter.state, packageDigest };
    if (manifest.expiresAt.getTime() <= Date.now()) {
      return {
        status: "expired" as const,
        matterState: matter.state,
        expiresAt: manifest.expiresAt,
      };
    }
    if (manifest.packageDigest !== packageDigest) {
      return { status: "stale" as const, matterState: matter.state, packageDigest };
    }
    const assembled = await requestOf(tx, matterId);
    if (!assembled.ok || assembled.digest !== manifest.manifestDigest) {
      return { status: "stale" as const, matterState: matter.state, packageDigest };
    }
    return {
      status: "current" as const,
      matterState: matter.state,
      packageDigest,
      manifestDigest: manifest.manifestDigest,
      pdfStatus: manifest.pdfStatus,
      expiresAt: manifest.expiresAt,
      unexecuted: true as const,
      portalRendering: assembled.portalRendering,
      files: assembled.files,
    };
  });
}
