import { boolean, foreignKey, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { matters } from "./matters";

export const filingReceipts = pgTable(
  "filing_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    applicationNumber: text("application_number"),
    releasedDigest: text("released_digest").notNull(),
    submittedDigest: text("submitted_digest").notNull(),
    reconciliation: text("reconciliation").notNull(),
    verified: boolean("verified").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "filing_receipts_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const officeActions = pgTable(
  "office_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    sourceText: text("source_text").notNull(),
    claimNumbers: jsonb("claim_numbers").$type<number[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "office_actions_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const docketDeadlines = pgTable(
  "docket_deadlines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    source: text("source").notNull(),
    ruleContext: text("rule_context").notNull(),
    proposedDue: text("proposed_due").notNull(),
    confirmed: boolean("confirmed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "docket_deadlines_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const responseDrafts = pgTable(
  "response_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    text: text("text").notNull(),
    supportNote: text("support_note").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "response_drafts_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const idsCandidates = pgTable(
  "ids_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    label: text("label").notNull(),
    reviewStatus: text("review_status").notNull().default("proposed"),
    submitted: boolean("submitted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "ids_candidates_matter_fk",
    }).onDelete("cascade"),
  ],
);
