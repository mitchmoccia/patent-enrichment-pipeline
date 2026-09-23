import { foreignKey, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { matters } from "./matters";

export const gateEvaluations = pgTable(
  "gate_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    gateId: text("gate_id").notNull(),
    policyVersion: text("policy_version").notNull(),
    dependencyDigest: text("dependency_digest").notNull(),
    snapshotRevision: integer("snapshot_revision").notNull(),
    outcome: text("outcome").notNull(),
    explanation: text("explanation").notNull(),
    evaluatorKind: text("evaluator_kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "gate_evaluations_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const gateReleases = pgTable(
  "gate_releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    manifestDigest: text("manifest_digest").notNull(),
    capacity: text("capacity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "gate_releases_matter_fk",
    }).onDelete("cascade"),
  ],
);
