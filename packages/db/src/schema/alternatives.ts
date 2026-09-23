import { boolean, foreignKey, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { matters } from "./matters";

export const alternatives = pgTable(
  "alternatives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    label: text("label").notNull(),
    origin: text("origin").notNull(),
    removesBenefit: text("removes_benefit"),
    explanation: text("explanation"),
    partitionTolerant: boolean("partition_tolerant").notNull().default(false),
    consistencyAssumption: text("consistency_assumption"),
    feasibility: text("feasibility").notNull().default("unknown"),
    rank: text("rank").notNull(),
    rankReason: text("rank_reason").notNull(),
    inSelectedDisclosure: boolean("in_selected_disclosure").notNull().default(false),
    experimentStatus: text("experiment_status").notNull().default("unavailable"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "alternatives_matter_fk",
    }).onDelete("cascade"),
  ],
);
