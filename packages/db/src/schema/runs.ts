import {
  boolean,
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

export const runStatusEnum = pgEnum("run_status", [
  "running",
  "paused",
  "cancelled",
  "completed",
  "blocked",
]);

export const stageNameEnum = pgEnum("stage_name", ["ingest", "analyze"]);

export const stageStatusEnum = pgEnum("stage_status", [
  "pending",
  "leased",
  "completed",
  "cancelled",
  "blocked",
]);

export const attemptStatusEnum = pgEnum("attempt_status", [
  "leased",
  "committed",
  "stale",
  "failed",
]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "reserved",
  "committed",
  "unknown",
  "released",
  "reconciled",
]);

export const externalStatusEnum = pgEnum("external_status", [
  "prepared",
  "dispatched",
  "completed",
  "unknown",
]);

export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    status: runStatusEnum("status").notNull().default("running"),
    snapshotRevision: integer("snapshot_revision").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    fenceToken: integer("fence_token").notNull().default(0),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("runs_tenant_matter_id").on(t.tenantId, t.matterId, t.id),
    unique("runs_idempotency").on(t.tenantId, t.matterId, t.createdBy, t.idempotencyKey),
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "runs_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const stages = pgTable(
  "stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    runId: uuid("run_id").notNull(),
    name: stageNameEnum("name").notNull(),
    status: stageStatusEnum("status").notNull().default("pending"),
    output: jsonb("output").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("stages_run_name").on(t.runId, t.name),
    foreignKey({
      columns: [t.tenantId, t.matterId, t.runId],
      foreignColumns: [runs.tenantId, runs.matterId, runs.id],
      name: "stages_run_fk",
    }).onDelete("cascade"),
  ],
);

export const stepAttempts = pgTable(
  "step_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    runId: uuid("run_id").notNull(),
    stageId: uuid("stage_id").notNull(),
    attemptNumber: integer("attempt_number").notNull(),
    fenceToken: integer("fence_token").notNull(),
    status: attemptStatusEnum("status").notNull().default("leased"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("step_attempts_stage_number").on(t.stageId, t.attemptNumber),
    unique("step_attempts_run_fence").on(t.runId, t.fenceToken),
    foreignKey({
      columns: [t.tenantId, t.matterId, t.runId],
      foreignColumns: [runs.tenantId, runs.matterId, runs.id],
      name: "step_attempts_run_fk",
    }).onDelete("cascade"),
  ],
);

export const idempotencyCommands = pgTable(
  "idempotency_commands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    actorId: text("actor_id").notNull(),
    operation: text("operation").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    response: jsonb("response").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("idempotency_commands_key").on(t.tenantId, t.matterId, t.actorId, t.operation, t.key),
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "idempotency_commands_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    runId: uuid("run_id").notNull(),
    operationId: text("operation_id").notNull(),
    status: reservationStatusEnum("status").notNull().default("reserved"),
    amountMicrousd: text("amount_microusd"),
    known: boolean("known").notNull().default(true),
    requestHash: text("request_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("reservations_operation").on(t.tenantId, t.operationId),
    foreignKey({
      columns: [t.tenantId, t.matterId, t.runId],
      foreignColumns: [runs.tenantId, runs.matterId, runs.id],
      name: "reservations_run_fk",
    }).onDelete("cascade"),
  ],
);

export const externalOperations = pgTable(
  "external_operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    runId: uuid("run_id").notNull(),
    operationId: text("operation_id").notNull(),
    status: externalStatusEnum("status").notNull().default("prepared"),
    requestHash: text("request_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("external_operations_operation").on(t.tenantId, t.operationId),
    foreignKey({
      columns: [t.tenantId, t.matterId, t.runId],
      foreignColumns: [runs.tenantId, runs.matterId, runs.id],
      name: "external_operations_run_fk",
    }).onDelete("cascade"),
  ],
);

export const outbox = pgTable(
  "outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    eventSequence: integer("event_sequence").notNull(),
    kind: text("kind").notNull(),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("outbox_matter_sequence").on(t.tenantId, t.matterId, t.eventSequence),
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "outbox_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const matterEvents = pgTable(
  "matter_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    sequence: integer("sequence").notNull(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("matter_events_sequence").on(t.tenantId, t.matterId, t.sequence),
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "matter_events_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const callbackReceipts = pgTable(
  "callback_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    callbackId: text("callback_id").notNull(),
    operationId: text("operation_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("callback_receipts_callback").on(t.tenantId, t.callbackId),
    foreignKey({
      columns: [t.tenantId, t.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "callback_receipts_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const runDecisions = pgTable(
  "run_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    runId: uuid("run_id").notNull(),
    kind: text("kind").notNull(),
    actorId: text("actor_id").notNull(),
    snapshotRevision: integer("snapshot_revision").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.matterId, t.runId],
      foreignColumns: [runs.tenantId, runs.matterId, runs.id],
      name: "run_decisions_run_fk",
    }).onDelete("cascade"),
  ],
);
