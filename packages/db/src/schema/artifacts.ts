import {
  foreignKey,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { matters } from "./matters";

export const artifactOriginEnum = pgEnum("artifact_origin", [
  "upload",
  "repository_snapshot",
  "public_reference",
  "derived",
  "experiment",
]);

export const scanStatusEnum = pgEnum("scan_status", ["quarantined", "clean", "rejected"]);

export const confidentialityEnum = pgEnum("confidentiality", [
  "public",
  "internal",
  "confidential",
  "restricted",
]);

export const ownershipStatusEnum = pgEnum("ownership_status", [
  "asserted_owned",
  "licensed",
  "public",
  "third_party",
  "unknown",
]);

export const extractionQualityEnum = pgEnum("extraction_quality", [
  "verified",
  "machine_extracted",
  "uncertain",
]);

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    originalName: text("original_name").notNull(),
    mediaType: text("media_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    objectKey: text("object_key").notNull().default(""),
    objectVersion: text("object_version").notNull().default(""),
    sha256: text("sha256").notNull(),
    storageDriver: text("storage_driver").notNull(),
    origin: artifactOriginEnum("origin").notNull().default("upload"),
    confidentiality: confidentialityEnum("confidentiality").notNull().default("confidential"),
    uploaderId: text("uploader_id").notNull(),
    ownershipStatus: ownershipStatusEnum("ownership_status").notNull().default("asserted_owned"),
    scanStatus: scanStatusEnum("scan_status").notNull(),
    scanDetail: text("scan_detail"),
    extractedText: text("extracted_text"),
    parentArtifactId: uuid("parent_artifact_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("artifacts_tenant_matter_id").on(t.tenantId, t.matterId, t.id),
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "artifacts_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const sourceSpans = pgTable(
  "source_spans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    artifactId: uuid("artifact_id").notNull(),
    locator: jsonb("locator").$type<Record<string, unknown>>().notNull(),
    excerpt: text("excerpt").notNull(),
    excerptSha256: text("excerpt_sha256").notNull(),
    extractionVersion: text("extraction_version").notNull(),
    extractionQuality: extractionQualityEnum("extraction_quality").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.matterId, t.artifactId],
      foreignColumns: [artifacts.tenantId, artifacts.matterId, artifacts.id],
      name: "source_spans_artifact_fk",
    }).onDelete("cascade"),
  ],
);
