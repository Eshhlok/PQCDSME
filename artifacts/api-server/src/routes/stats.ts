import { Router, type IRouter } from "express";
import { db } from "../lib/db";
import { entriesTable } from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router: IRouter = Router();

// TODAY — entries for today grouped by hour (IST)
router.get("/stats/today", async (req, res) => {
  try {
    const { plantId, section, fieldKey } = req.query;

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const today = istDate.toISOString().split('T')[0];

    const rows = await db
      .select({
        hour: sql<string>`to_char(created_at AT TIME ZONE 'Asia/Kolkata', 'HH24":00"')`,
        value: sql<number>`sum(cast(field_value as numeric))`,
      })
      .from(entriesTable)
      .where(
        and(
          eq(entriesTable.plantId, Number(plantId)),
          eq(entriesTable.section, String(section)),
          eq(entriesTable.fieldKey, String(fieldKey)),
          eq(entriesTable.entryDate, today),
        )
      )
      .groupBy(sql`to_char(created_at AT TIME ZONE 'Asia/Kolkata', 'HH24":00"')`)
      .orderBy(sql`to_char(created_at AT TIME ZONE 'Asia/Kolkata', 'HH24":00"')`);

    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch today stats", details: String(err) });
  }
});

// CUMULATIVE — running total for current month day by day
router.get("/stats/cumulative", async (req, res) => {
  try {
    const { plantId, section, fieldKey, month, year } = req.query;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const rows = await db
      .select({
        date: entriesTable.entryDate,
        value: sql<number>`sum(cast(${entriesTable.fieldValue} as numeric))`,
      })
      .from(entriesTable)
      .where(
        and(
          eq(entriesTable.plantId, Number(plantId)),
          eq(entriesTable.section, String(section)),
          eq(entriesTable.fieldKey, String(fieldKey)),
          gte(entriesTable.entryDate, startDate),
          lte(entriesTable.entryDate, endDate),
        )
      )
      .groupBy(entriesTable.entryDate)
      .orderBy(entriesTable.entryDate);

    let running = 0;
    const cumulative = rows.map(row => {
      running += Number(row.value);
      return { date: row.date, value: running };
    });

    res.json(cumulative);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch cumulative stats", details: String(err) });
  }
});

// MONTH ON MONTH — total per month for last 6 months
router.get("/stats/mom", async (req, res) => {
  try {
    const { plantId, section, fieldKey } = req.query;

    // Get start date in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    istNow.setMonth(istNow.getMonth() - 5);
    istNow.setDate(1);
    const startDate = istNow.toISOString().split('T')[0];

    const rows = await db
      .select({
        month: sql<string>`to_char(${entriesTable.entryDate}::date, 'Mon YYYY')`,
        monthNum: sql<string>`to_char(${entriesTable.entryDate}::date, 'YYYY-MM')`,
        value: sql<number>`sum(cast(${entriesTable.fieldValue} as numeric))`,
      })
      .from(entriesTable)
      .where(
        and(
          eq(entriesTable.plantId, Number(plantId)),
          eq(entriesTable.section, String(section)),
          eq(entriesTable.fieldKey, String(fieldKey)),
          gte(entriesTable.entryDate, startDate),
        )
      )
      .groupBy(
        sql`to_char(${entriesTable.entryDate}::date, 'Mon YYYY')`,
        sql`to_char(${entriesTable.entryDate}::date, 'YYYY-MM')`
      )
      .orderBy(sql`to_char(${entriesTable.entryDate}::date, 'YYYY-MM')`);

    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch MoM stats", details: String(err) });
  }
});

// YEAR ON YEAR — same months this year vs last year
router.get("/stats/yoy", async (req, res) => {
  try {
    const { plantId, section, fieldKey } = req.query;
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear - 1}-01-01`;

    const rows = await db
      .select({
        year: sql<number>`extract(year from ${entriesTable.entryDate}::date)`,
        month: sql<string>`to_char(${entriesTable.entryDate}::date, 'Mon')`,
        monthNum: sql<number>`extract(month from ${entriesTable.entryDate}::date)`,
        value: sql<number>`sum(cast(${entriesTable.fieldValue} as numeric))`,
      })
      .from(entriesTable)
      .where(
        and(
          eq(entriesTable.plantId, Number(plantId)),
          eq(entriesTable.section, String(section)),
          eq(entriesTable.fieldKey, String(fieldKey)),
          gte(entriesTable.entryDate, startDate),
        )
      )
      .groupBy(
        sql`extract(year from ${entriesTable.entryDate}::date)`,
        sql`to_char(${entriesTable.entryDate}::date, 'Mon')`,
        sql`extract(month from ${entriesTable.entryDate}::date)`
      )
      .orderBy(
        sql`extract(year from ${entriesTable.entryDate}::date)`,
        sql`extract(month from ${entriesTable.entryDate}::date)`
      );

    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch YoY stats", details: String(err) });
  }
});

export default router;