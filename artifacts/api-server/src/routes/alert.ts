import { Router, type IRouter } from "express";
import { db } from "../lib/db";
import { entriesTable, targetsTable, shiftsTable, alertReadsTable } from "@workspace/db/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";

const router: IRouter = Router();

const SECTIONS = ["production", "quality", "cost", "dispatch", "safety", "morale", "environment"];

// Primary field key per section (used to check missed entries)
const PRIMARY_FIELD: Record<string, string> = {
  production: "actual",
  quality:    "defects",
  cost:       "actual",
  dispatch:   "dispatched",
  safety:     "near_miss",
  morale:     "attendance",
  environment:"energy",
};

// Target field key per section (used to check below-target)
const TARGET_FIELD: Record<string, string> = {
  production: "target",
  quality:    "defects",
  cost:       "budget",
  dispatch:   "planned",
  safety:     "near_miss",
  morale:     "attendance",
  environment:"energy",
};

function getISTDate(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split("T")[0];
}

function getISTHHMM(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(11, 16); // "HH:MM"
}

// Returns true if a shift has fully ended by now (IST)
// Handles overnight shifts e.g. 22:00 → 06:00
function shiftHasEnded(startTime: string, endTime: string, nowHHMM: string): boolean {
  if (endTime > startTime) {
    // Normal shift e.g. 06:00 → 14:00
    return nowHHMM >= endTime;
  } else {
    // Overnight shift e.g. 22:00 → 06:00: ended if now is after endTime (next morning)
    return nowHHMM >= endTime && nowHHMM < startTime;
  }
}

// GET /api/alerts?plantId=1
router.get("/alerts", async (req, res) => {
  try {
    const { plantId } = req.query;
    const userId = (req as any).user?.id;
    const plantIdNum = Number(plantId);

    const todayIST = getISTDate();
    const nowHHMM  = getISTHHMM();
    const month    = parseInt(todayIST.slice(5, 7));
    const year     = parseInt(todayIST.slice(0, 4));

    // 1. Fetch all shifts for this plant
    const shifts = await db
      .select()
      .from(shiftsTable)
      .where(eq(shiftsTable.plantId, plantIdNum))
      .orderBy(shiftsTable.startTime);

    // 2. Fetch month cumulative per section (sum of fieldValue for this month)
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay   = new Date(year, month, 0).getDate();
    const endDate   = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const monthTotals = await db
      .select({
        section:  entriesTable.section,
        fieldKey: entriesTable.fieldKey,
        total:    sql<number>`sum(cast(${entriesTable.fieldValue} as numeric))`,
      })
      .from(entriesTable)
      .where(
        and(
          eq(entriesTable.plantId, plantIdNum),
          gte(entriesTable.entryDate, startDate),
          lte(entriesTable.entryDate, endDate),
        )
      )
      .groupBy(entriesTable.section, entriesTable.fieldKey);

    // 3. Fetch targets for this month
    const targets = await db
      .select()
      .from(targetsTable)
      .where(
        and(
          eq(targetsTable.plantId, plantIdNum),
          eq(targetsTable.month, month),
          eq(targetsTable.year, year),
        )
      );

    // 4. Fetch today's entries (to check missed shifts)
    const todayEntries = await db
      .select({
        section:  entriesTable.section,
        shift:    entriesTable.shift,
        fieldKey: entriesTable.fieldKey,
      })
      .from(entriesTable)
      .where(
        and(
          eq(entriesTable.plantId, plantIdNum),
          eq(entriesTable.entryDate, todayIST),
        )
      );

    // 5. Fetch already-read alert keys for this user
    const reads = userId
      ? await db
          .select({ alertKey: alertReadsTable.alertKey })
          .from(alertReadsTable)
          .where(eq(alertReadsTable.userId, String(userId)))
      : [];
    const readKeys = new Set(reads.map(r => r.alertKey));

    const alerts: {
      key: string;
      type: "missed_entry" | "below_target";
      severity: "warning" | "critical";
      title: string;
      description: string;
      section: string;
      read: boolean;
    }[] = [];

    // ── Missed entry alerts ────────────────────────────────────────────────
    for (const shift of shifts) {
      if (!shiftHasEnded(shift.startTime, shift.endTime, nowHHMM)) continue;

      for (const section of SECTIONS) {
        const primaryField = PRIMARY_FIELD[section];
        const hasEntry = todayEntries.some(
          e => e.section === section && e.shift.toLowerCase() === shift.name.toLowerCase()
        );
        if (!hasEntry) {
          const key = `missed:${section}:${shift.name}:${todayIST}`;
          alerts.push({
            key,
            type: "missed_entry",
            severity: "warning",
            title: `Missed entry — ${section.charAt(0).toUpperCase() + section.slice(1)}`,
            description: `No data entered for ${shift.name} shift (${shift.startTime}–${shift.endTime}) on ${todayIST}.`,
            section,
            read: readKeys.has(key),
          });
        }
      }
    }

    // ── Below target alerts ────────────────────────────────────────────────
    for (const section of SECTIONS) {
      const targetField = TARGET_FIELD[section];
      const target = targets.find(t => t.section === section && t.fieldKey === targetField);
      if (!target) continue;

      const actual = monthTotals.find(
        m => m.section === section && m.fieldKey === PRIMARY_FIELD[section]
      );
      const actualVal  = actual ? Number(actual.total) : 0;
      const targetVal  = Number(target.targetValue);
      const pct        = targetVal > 0 ? (actualVal / targetVal) * 100 : 100;

      if (pct < 100) {
        const key = `below_target:${section}:${year}-${String(month).padStart(2, "0")}`;
        const gap = (targetVal - actualVal).toFixed(0);
        alerts.push({
          key,
          type: "below_target",
          severity: pct < 75 ? "critical" : "warning",
          title: `Below target — ${section.charAt(0).toUpperCase() + section.slice(1)}`,
          description: `Month cumulative is ${pct.toFixed(1)}% of target. Gap: ${Number(gap).toLocaleString()} units.`,
          section,
          read: readKeys.has(key),
        });
      }
    }

    res.json(alerts);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch alerts", details: String(err) });
  }
});

// POST /api/alerts/read — mark one or more alerts as read
router.post("/alerts/read", async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { alertKeys }: { alertKeys: string[] } = req.body;
    if (!alertKeys?.length) return res.status(400).json({ error: "alertKeys required" });

    // upsert — ignore conflicts (unique constraint on userId + alertKey)
    await db
      .insert(alertReadsTable)
      .values(alertKeys.map(key => ({ userId: String(userId), alertKey: key })))
      .onConflictDoNothing();

    res.json({ success: true });
  } catch (err: any) {
    console.error('ALERTS ERROR:', err);
    res.status(500).json({ error: "Failed to mark alerts read", details: String(err) });
  }
});

export default router;