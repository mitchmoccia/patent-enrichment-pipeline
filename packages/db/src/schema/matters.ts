/**
 * Matter-owned domain tables for S01. Every row carries tenant_id (the Better
 * Auth organization id) and, where applicable, matter_id. Composite foreign keys
 * (tenant_id, matter_id) make cross-tenant / cross-matter links impossible even
 * before RLS. RLS policies and grants are applied in sql/rls.sql.
 */
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

export const matterStateEnum = pgEnum("matter_state", [
  "intake",
  "developing",
  "researching",
  "drafting",
  "review_required",
  "package_prepared",
  "released",
  "filing_unconfirmed",
  "filed",
  "prosecution",
  "granted_recorded",
  "closed",
]);

export const operatingModeEnum = pgEnum("operating_mode", [
  "private_development",
  "individual_self_filer",
  "practitioner_supervised",
  "entity_applicant",
]);

export const aclRoleEnum = pgEnum("acl_role", ["owner", "editor", "reviewer", "viewer"]);

export const assertionClassEnum = pgEnum("assertion_class", [
  "supplied_fact",
  "observed_result",
  "engineering_inference",
  "proposed_embodiment",
  "general_knowledge",
  "legal_assessment",
  "commercial_assumption",
]);

export const matters = pgTable(
  "matters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    title: text("title").notNull(),
    goal: text("goal"),
    applicantMode: operatingModeEnum("applicant_mode").notNull().default("private_development"),
    state: matterStateEnum("state").notNull().default("intake"),
    headRevision: integer("head_revision").notNull().default(0),
    /** Human-approved processing policy. trainingUseAllowed must stay false. */
    processingPolicy: jsonb("processing_policy").$type<Record<string, unknown> | null>(),
    /** Approved run cap in micro-USD. Reservations in S03 count against this cap. */
    runBudgetMicrousd: text("run_budget_microusd"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("matters_tenant_id_key").on(t.tenantId, t.id)],
);

export const matterAcl = pgTable(
  "matter_acl",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    principalId: text("principal_id").notNull(),
    role: aclRoleEnum("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "matter_acl_matter_fk",
    }).onDelete("cascade"),
    unique("matter_acl_unique").on(t.tenantId, t.matterId, t.principalId),
  ],
);

export const matterSnapshots = pgTable(
  "matter_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    revision: integer("revision").notNull(),
    digest: text("digest").notNull(),
    parentSnapshotId: uuid("parent_snapshot_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "matter_snapshots_matter_fk",
    }).onDelete("cascade"),
    unique("matter_snapshots_revision_unique").on(t.tenantId, t.matterId, t.revision),
  ],
);

export const assertions = pgTable(
  "assertions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    version: integer("version").notNull().default(1),
    text: text("text").notNull(),
    classification: assertionClassEnum("classification").notNull(),
    proposedByKind: text("proposed_by_kind").notNull(),
    proposedById: text("proposed_by_id").notNull(),
    status: text("status").notNull().default("proposed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "assertions_matter_fk",
    }).onDelete("cascade"),
  ],
);
