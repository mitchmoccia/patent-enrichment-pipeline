import { foreignKey, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { matters } from "./matters";

export const importedReferences = pgTable(
  "imported_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    title: text("title").notNull(),
    publicationNumber: text("publication_number"),
    publicationDate: text("publication_date"),
    familyDate: text("family_date"),
    fullText: text("full_text"),
    fullTextStatus: text("full_text_status").notNull(),
    passage: text("passage"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "imported_references_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const researchQueries = pgTable(
  "research_queries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    query: text("query").notNull(),
    plan: jsonb("plan").$type<Record<string, unknown>>().notNull(),
    stopReason: text("stop_reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "research_queries_matter_fk",
    }).onDelete("cascade"),
  ],
);
