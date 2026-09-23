import { foreignKey, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { matters } from "./matters";

export const claimDrafts = pgTable(
  "claim_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    category: text("category").notNull(),
    dependsOn: uuid("depends_on"),
    connective: text("connective").notNull(),
    limitations: jsonb("limitations")
      .$type<{ id: string; text: string; actor: string | null }[]>()
      .notNull(),
    revision: integer("revision").notNull().default(1),
    supportStatus: text("support_status").notNull().default("current"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "claim_drafts_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const embodimentConflicts = pgTable(
  "embodiment_conflicts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    leftEmbodimentId: uuid("left_embodiment_id").notNull(),
    rightEmbodimentId: uuid("right_embodiment_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "embodiment_conflicts_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const claimSupport = pgTable(
  "claim_support",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    claimId: uuid("claim_id").notNull(),
    limitationId: text("limitation_id").notNull(),
    embodimentId: uuid("embodiment_id").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "claim_support_matter_fk",
    }).onDelete("cascade"),
  ],
);
