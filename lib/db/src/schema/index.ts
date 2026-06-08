import { pgTable, text, serial, integer, numeric, timestamp, date, time, unique } from "drizzle-orm/pg-core";
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

// ── Shifts ────────────────────────────────────────────────────────────────────
// Admin-editable shifts per plant (e.g. "Morning", "07:00", "15:00")
export const shiftsTable = pgTable("shifts", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plantsTable.id).notNull(),
  name: text("name").notNull(),          // e.g. "Morning"
  startTime: text("start_time").notNull(), // "HH:MM" 24h
  endTime: text("end_time").notNull(),     // "HH:MM" 24h
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShiftSchema = createInsertSchema(shiftsTable).omit({ id: true, createdAt: true });
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shiftsTable.$inferSelect;

// ── Alert Reads ───────────────────────────────────────────────────────────────
// Tracks which alerts a user has dismissed (mark as read)
// alert_key is a deterministic string e.g. "missed:production:Morning:2024-06-08"
// or "below_target:quality:2024-06"
export const alertReadsTable = pgTable("alert_reads", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),     // Supabase user UUID
  alertKey: text("alert_key").notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
}, (t) => ({
  uniq: unique().on(t.userId, t.alertKey),
}));

export const insertAlertReadSchema = createInsertSchema(alertReadsTable).omit({ id: true, readAt: true });
export type InsertAlertRead = z.infer<typeof insertAlertReadSchema>;
export type AlertRead = typeof alertReadsTable.$inferSelect;