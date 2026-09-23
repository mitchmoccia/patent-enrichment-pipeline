import { foreignKey, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { matters } from "./matters";

export const inventionExtractions = pgTable(
  "invention_extractions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    snapshotRevision: integer("snapshot_revision").notNull(),
    route: text("route").notNull(),
    status: text("status").notNull(),
    detail: text("detail").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "invention_extractions_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const inventionElements = pgTable(
  "invention_elements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    extractionId: uuid("extraction_id").notNull(),
    kind: text("kind").notNull(),
    text: text("text").notNull(),
    classification: text("classification").notNull(),
    proposedByKind: text("proposed_by_kind").notNull(),
    sourceId: text("source_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "invention_elements_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const inventionQuestions = pgTable(
  "invention_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    text: text("text").notNull(),
    whyItMatters: text("why_it_matters").notNull(),
    affectedFeature: text("affected_feature").notNull(),
    sourceId: text("source_id"),
    origin: text("origin").notNull(),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("invention_questions_text").on(t.matterId, t.text),
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "invention_questions_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const inventionAnswers = pgTable(
  "invention_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    questionId: uuid("question_id").notNull(),
    text: text("text").notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull(),
    answeredBy: text("answered_by").notNull(),
    snapshotRevision: integer("snapshot_revision").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "invention_answers_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const developmentTasks = pgTable(
  "development_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    text: text("text").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("development_tasks_text").on(t.matterId, t.text),
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "development_tasks_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const mechanismSuggestions = pgTable(
  "mechanism_suggestions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    text: text("text").notNull(),
    classification: text("classification").notNull(),
    proposedByKind: text("proposed_by_kind").notNull(),
    status: text("status").notNull().default("proposed"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    inventionDate: text("invention_date"),
    inventorship: text("inventorship").notNull().default("unresolved"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("mechanism_suggestions_text").on(t.matterId, t.text),
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "mechanism_suggestions_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const inventionAnalyses = pgTable(
  "invention_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    snapshotRevision: integer("snapshot_revision").notNull(),
    status: text("status").notNull(),
    subject: text("subject").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "invention_analyses_matter_fk",
    }).onDelete("cascade"),
  ],
);
