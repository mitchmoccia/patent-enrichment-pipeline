import { foreignKey, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { matters } from "./matters";

export const exportManifests = pgTable(
  "export_manifests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    packageDigest: text("package_digest").notNull(),
    manifestDigest: text("manifest_digest").notNull(),
    files: jsonb("files").$type<{ name: string; sha256: string }[]>().notNull(),
    pdfStatus: text("pdf_status").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "export_manifests_matter_fk",
    }).onDelete("cascade"),
  ],
);
