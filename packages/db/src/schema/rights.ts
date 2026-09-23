import { boolean, foreignKey, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { matters } from "./matters";

export const legalSources = pgTable("legal_sources", {
  sourceKey: text("source_key").primaryKey(),
  title: text("title").notNull(),
  kind: text("kind").notNull(),
  publishedOn: text("published_on").notNull(),
  effectiveOn: text("effective_on").notNull(),
  supersededBy: text("superseded_by"),
  reviewStatus: text("review_status").notNull().default("seeded"),
  counselApproved: boolean("counsel_approved").notNull().default(false),
});

export const contributions = pgTable(
  "contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    role: text("role").notNull(),
    personLabel: text("person_label").notNull(),
    account: text("account").notNull(),
    legalInventorship: text("legal_inventorship").notNull().default("unresolved"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "contributions_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const chronologyEvents = pgTable(
  "chronology_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    kind: text("kind").notNull(),
    precision: text("precision").notNull(),
    eventDate: text("event_date"),
    note: text("note").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "chronology_events_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const embodiments = pgTable(
  "embodiments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    label: text("label").notNull(),
    developedOn: text("developed_on").notNull(),
    filingOn: text("filing_on"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "embodiments_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const matterRules = pgTable(
  "matter_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    sourceKey: text("source_key").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("matter_rules_source").on(t.matterId, t.sourceKey),
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "matter_rules_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const releaseChoices = pgTable(
  "release_choices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("release_choices_matter").on(t.matterId),
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "release_choices_matter_fk",
    }).onDelete("cascade"),
  ],
);
