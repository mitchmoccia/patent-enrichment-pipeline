import {
  boolean,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { matters } from "./matters";

export const specificationSections = pgTable(
  "specification_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    kind: text("kind").notNull(),
    text: text("text").notNull(),
    hypothetical: boolean("hypothetical").notNull().default(false),
    evidenceNote: text("evidence_note"),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("specification_sections_kind").on(table.matterId, table.kind),
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "specification_sections_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const specificationFigures = pgTable(
  "specification_figures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    numeral: text("numeral").notNull(),
    label: text("label").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("specification_figures_numeral").on(table.matterId, table.numeral),
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "specification_figures_matter_fk",
    }).onDelete("cascade"),
  ],
);

export const terminology = pgTable(
  "terminology",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: text("tenant_id").notNull(),
    matterId: uuid("matter_id").notNull(),
    term: text("term").notNull(),
    definition: text("definition").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("terminology_term").on(table.matterId, table.term),
    foreignKey({
      columns: [table.tenantId, table.matterId],
      foreignColumns: [matters.tenantId, matters.id],
      name: "terminology_matter_fk",
    }).onDelete("cascade"),
  ],
);
