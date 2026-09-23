import { createHash } from "node:crypto";
import { type Database, schema, withTenant } from "@patent/db";
import {
  inspectUpload,
  type ObjectStore,
  resolveObjectStore,
  StorageUnavailable,
} from "@patent/documents";
import { QuarantineRejection, sha256Hex } from "@patent/security";
import { desc, eq } from "drizzle-orm";
import type { AuthorizedContext } from "./context";
import { AppError } from "./errors";
import { assertHumanActor } from "./human";
import { getMatter } from "./matters";

const EXTRACTION_VERSION = "s02-1";

export interface IngestInput {
  matterId: string;
  filename: string;
  mediaType: string;
  bytes: Uint8Array;
  claimedSha256: string;
  store: ObjectStore;
}

export interface IngestResult {
  id: string;
  scanStatus: "clean" | "rejected";
  driver: string;
  detail: string;
}

async function requireVisible(db: Database, ctx: AuthorizedContext, matterId: string) {
  const visible = await getMatter(db, ctx, matterId);
  if (!visible) throw new AppError("UNAUTHORIZED", "revoked or unknown matter");
  return visible.matter;
}

export async function ingestArtifact(
  db: Database,
  ctx: AuthorizedContext,
  input: IngestInput,
): Promise<IngestResult> {
  assertHumanActor(ctx);
  await requireVisible(db, ctx, input.matterId);
  const actual = sha256Hex(input.bytes);
  if (actual !== input.claimedSha256.trim().toLowerCase()) {
    return reject(
      db,
      ctx,
      input,
      actual,
      "HASH_MISMATCH",
      "Claimed SHA-256 does not match. Nothing was stored.",
    );
  }
  let extracted: ReturnType<typeof inspectUpload>;
  try {
    extracted = inspectUpload(input.filename, input.mediaType, input.bytes);
  } catch (error) {
    if (error instanceof QuarantineRejection) {
      return reject(db, ctx, input, actual, error.code, error.message);
    }
    throw error;
  }
  const described = input.store.describe();
  if (!described.ready || input.store.driver === "unconfigured") {
    throw new AppError("PROVIDER_UNAVAILABLE", described.message);
  }
  const key = `${ctx.tenantId}/${input.matterId}/${actual}`;
  let stored: { version: string; driver: "s3" | "local-filesystem" };
  try {
    stored = await input.store.put(key, input.bytes, input.mediaType || "application/octet-stream");
  } catch (error) {
    if (error instanceof StorageUnavailable)
      throw new AppError("PROVIDER_UNAVAILABLE", error.message);
    throw error;
  }
  const id = await withTenant(db, ctx, async (tx) => {
    const [row] = await tx
      .insert(schema.artifacts)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        originalName: input.filename,
        mediaType: input.mediaType,
        sizeBytes: input.bytes.byteLength,
        objectKey: key,
        objectVersion: stored.version,
        sha256: actual,
        storageDriver: stored.driver,
        uploaderId: ctx.userId,
        scanStatus: "clean",
        scanDetail: extracted.note ?? "Extracted.",
        extractedText: extracted.text,
      })
      .returning({ id: schema.artifacts.id });
    if (!row) throw new AppError("POLICY_BLOCKED", "artifact insert was blocked");
    if (extracted.spans.length > 0) {
      await tx.insert(schema.sourceSpans).values(
        extracted.spans.map((item) => ({
          tenantId: ctx.tenantId,
          matterId: input.matterId,
          artifactId: row.id,
          locator: item.locator,
          excerpt: item.excerpt,
          excerptSha256: createHash("sha256").update(item.excerpt.normalize("NFC")).digest("hex"),
          extractionVersion: EXTRACTION_VERSION,
          extractionQuality: item.quality,
        })),
      );
    }
    return row.id;
  });
  return { id, scanStatus: "clean", driver: stored.driver, detail: extracted.note ?? "Extracted." };
}

/** Web entry. Resolves S3 or the explicit local driver from the environment. */
export async function ingestUploadedArtifact(
  db: Database,
  ctx: AuthorizedContext,
  input: Omit<IngestInput, "store" | "claimedSha256"> & { claimedSha256?: string },
  env: NodeJS.ProcessEnv,
): Promise<IngestResult> {
  const claimedSha256 = input.claimedSha256?.trim() || sha256Hex(input.bytes);
  return ingestArtifact(db, ctx, {
    ...input,
    claimedSha256,
    store: resolveObjectStore(env),
  });
}

async function reject(
  db: Database,
  ctx: AuthorizedContext,
  input: IngestInput,
  actualSha: string,
  code: string,
  detail: string,
): Promise<IngestResult> {
  const id = await withTenant(db, ctx, async (tx) => {
    const [row] = await tx
      .insert(schema.artifacts)
      .values({
        tenantId: ctx.tenantId,
        matterId: input.matterId,
        originalName: input.filename,
        mediaType: input.mediaType,
        sizeBytes: input.bytes.byteLength,
        sha256: actualSha,
        storageDriver: "none",
        uploaderId: ctx.userId,
        scanStatus: "rejected",
        scanDetail: `${code}: ${detail}`,
        extractedText: null,
      })
      .returning({ id: schema.artifacts.id });
    if (!row) throw new AppError("POLICY_BLOCKED", "rejection record was blocked");
    return row.id;
  });
  return { id, scanStatus: "rejected", driver: "none", detail: `${code}: ${detail}` };
}

export async function listArtifacts(db: Database, ctx: AuthorizedContext, matterId: string) {
  return withTenant(db, ctx, (tx) =>
    tx
      .select()
      .from(schema.artifacts)
      .where(eq(schema.artifacts.matterId, matterId))
      .orderBy(desc(schema.artifacts.createdAt)),
  );
}

export async function getArtifact(db: Database, ctx: AuthorizedContext, artifactId: string) {
  return withTenant(db, ctx, async (tx) => {
    const [artifact] = await tx
      .select()
      .from(schema.artifacts)
      .where(eq(schema.artifacts.id, artifactId));
    if (!artifact) return null;
    const spans = await tx
      .select()
      .from(schema.sourceSpans)
      .where(eq(schema.sourceSpans.artifactId, artifactId));
    return { artifact, spans };
  });
}
