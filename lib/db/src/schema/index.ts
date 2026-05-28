import { pgTable, text, serial, integer, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const plantsTable = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlantSchema = createInsertSchema(plantsTable).omit({ id: true, createdAt: true });
export type InsertPlant = z.infer<typeof insertPlantSchema>;
export type Plant = typeof plantsTable.$inferSelect;

export const entriesTable = pgTable("entries", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plantsTable.id).notNull(),
  section: text("section").notNull(),
  entryDate: date("entry_date").notNull(),
  shift: text("shift").notNull().default("morning"),
  fieldKey: text("field_key").notNull(),
  fieldValue: numeric("field_value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEntrySchema = createInsertSchema(entriesTable).omit({ id: true, createdAt: true });
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Entry = typeof entriesTable.$inferSelect;

export const targetsTable = pgTable("targets", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plantsTable.id).notNull(),
  section: text("section").notNull(),
  fieldKey: text("field_key").notNull(),
  targetValue: numeric("target_value").notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTargetSchema = createInsertSchema(targetsTable).omit({ id: true, createdAt: true });
export type InsertTarget = z.infer<typeof insertTargetSchema>;
export type Target = typeof targetsTable.$inferSelect;

export const insightsTable = pgTable("insights", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plantsTable.id).notNull(),
  section: text("section").notNull(),
  chartType: text("chart_type").notNull(),
  insightText: text("insight_text").notNull(),
  insightDate: date("insight_date").notNull(),
  editedBy: text("edited_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInsightSchema = createInsertSchema(insightsTable).omit({ id: true, createdAt: true });
export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type Insight = typeof insightsTable.$inferSelect;