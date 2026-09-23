import { boolean, foreignKey, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { matters } from "./matters";

export const watchPlans = pgTable(
  "watch_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    source: text("source").notNull(),
    cadence: text("cadence").notNull(),
    budgetMicrousd: text("budget_microusd").notNull(),
    approved: boolean("approved").notNull(),
    demandLetters: boolean("demand_letters").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "watch_plans_matter_fk",
    }).onDelete("cascade"),
  ],
);
