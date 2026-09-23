import { foreignKey, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { matters } from "./matters";

export const claimLimitations = pgTable(
  "claim_limitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "claim_limitations_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const priorArtFindings = pgTable(
  "prior_art_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    limitationId: uuid("limitation_id").notNull(),
    kind: text("kind").notNull(),
    legalStatus: text("legal_status").notNull(),
    reason: text("reason"),
    relevance: text("relevance").notNull(),
    quote: text("quote").notNull(),
    motivation: text("motivation"),
    referenceIds: jsonb("reference_ids").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "prior_art_findings_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const eligibilityReviews = pgTable(
  "eligibility_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    limitationId: uuid("limitation_id").notNull(),
    answer: text("answer").notNull(),
    legalStatus: text("legal_status").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "eligibility_reviews_matter_fk",
    }).onDelete("cascade"),
  ],
);
