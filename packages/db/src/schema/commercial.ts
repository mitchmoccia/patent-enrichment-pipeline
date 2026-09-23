import { foreignKey, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { matters } from "./matters";

export const commercialAssessments = pgTable(
  "commercial_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    buyer: text("buyer"),
    substitute: text("substitute"),
    evidenceRequest: text("evidence_request"),
    strategy: text("strategy").notNull(),
    decision: text("decision").notNull(),
    productRevenueMicrousd: text("product_revenue_microusd"),
    productCostMicrousd: text("product_cost_microusd"),
    patentCostMicrousd: text("patent_cost_microusd"),
    productCashflowMicrousd: text("product_cashflow_microusd"),
    incrementalPatentValueMicrousd: text("incremental_patent_value_microusd"),
    unknowns: jsonb("unknowns").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "commercial_assessments_matter_fk",
    }).onDelete("cascade"),
  ],
);
