import { Router, type IRouter } from "express";
import { db } from "../lib/db";
import { entriesTable, targetsTable, shiftsTable, alertReadsTable } from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const SECTIONS = ["production", "quality", "cost", "dispatch", "safety", "morale", "environment"];

const PRIMARY_FIELD: Record<string, string> = {
  production: "actual",
  quality:    "defects",
  cost:       "actual",
  dispatch:   "dispatched",
  safety:     "near_miss",
  morale:     "attendance",
  environment:"energy",
};

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
  return ist.toISOString().slice(11, 16);
}

function shiftHasEnded(startTime: string, endTime: string, nowHHMM: string): boolean {
  if (endTime > startTime) {
    return nowHHMM >= endTime;
  } else {
    return nowHHMM >= endTime && nowHHMM < startTime;
  }
}

// GET /api/alerts?plantId=1
router.get("/alerts", requireAuth, async (req, res) => {
  try {
    const plantIdNum = Number(req.query.plantId);
    const userId = req.user!.id; // string UUID from requireAuth

    const todayIST = getISTDate();
    const nowHHMM  = getISTHHMM();
    const month    = parseInt(todayIST.slice(5, 7));
    const year     = parseInt(todayIST.slice(0, 4));

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay   = new Date(year, month, 0).getDate();
    const endDate   = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // ── All 4 queries in parallel ─────────────────────────────────────────
    const [shifts, monthTotals, targets, reads] = await Promise.all([
      // 1. Shifts for this plant
      db.select()
        .from(shiftsTable)
        .where(eq(shiftsTable.plantId, plantIdNum))
        .orderBy(shiftsTable.startTime),

      // 2. Month cumulative per section+fieldKey
      db.select({
          section:  entriesTable.section,
          fieldKey: entriesTable.fieldKey,
          total:    sql<number>`sum(cast(${entriesTable.fieldValue} as numeric))`,
        })
        .from(entriesTable)
        .where(and(
          eq(entriesTable.plantId, plantIdNum),
          gte(entriesTable.entryDate, startDate),
          lte(entriesTable.entryDate, endDate),
        ))
        .groupBy(entriesTable.section, entriesTable.fieldKey),

      // 3. Targets for this month
      db.select()
        .from(targetsTable)
        .where(and(
          eq(targetsTable.plantId, plantIdNum),
          eq(targetsTable.month, month),
          eq(targetsTable.year, year),
        )),

      // 4. Already-read alert keys for this user
      db.select({ alertKey: alertReadsTable.alertKey })
        .from(alertReadsTable)
        .where(eq(alertReadsTable.userId, userId)),
    ]);

    // ── Build lookup structures in JS — zero extra DB calls ───────────────

    // Today's entries: re-use monthTotals won't work for shift-level check,
    // but we can derive "has any entry today" from a targeted query.
    // We do this as a 5th query but it runs after Promise.all resolves only
    // if shifts exist, keeping the common case fast (most plants have shifts).
    // Actually we fetch it in parallel too — add to the Promise.all above would
    // require restructuring; instead do a second small parallel pair:
    const todayEntries = shifts.length > 0
      ? await db.select({
            section: entriesTable.section,
            shift:   entriesTable.shift,
          })
          .from(entriesTable)
          .where(and(
            eq(entriesTable.plantId, plantIdNum),
            eq(entriesTable.entryDate, todayIST),
          ))
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

    // ── Missed entry alerts ───────────────────────────────────────────────
    for (const shift of shifts) {
      if (!shiftHasEnded(shift.startTime, shift.endTime, nowHHMM)) continue;

      for (const section of SECTIONS) {
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

    // ── Below target alerts ───────────────────────────────────────────────
    for (const section of SECTIONS) {
      const targetField = TARGET_FIELD[section];
      const target = targets.find(t => t.section === section && t.fieldKey === targetField);
      if (!target) continue;

      const actual    = monthTotals.find(m => m.section === section && m.fieldKey === PRIMARY_FIELD[section]);
      const actualVal = actual ? Number(actual.total) : 0;
      const targetVal = Number(target.targetValue);
      const pct       = targetVal > 0 ? (actualVal / targetVal) * 100 : 100;

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
    console.error("[alerts] GET /alerts", err);
    res.status(500).json({ error: "Failed to fetch alerts", details: String(err) });
  }
});

// POST /api/alerts/read — mark one or more alerts as read
router.post("/alerts/read", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { alertKeys }: { alertKeys: string[] } = req.body;

    if (!alertKeys?.length) {
      return res.status(400).json({ error: "alertKeys required" });
    }

    // alertReadsTable has unique(userId, alertKey) — onConflictDoNothing is safe
    await db
      .insert(alertReadsTable)
      .values(alertKeys.map(key => ({ userId, alertKey: key })))
      .onConflictDoNothing();

    res.json({ success: true });
  } catch (err: any) {
    console.error("[alerts] POST /alerts/read", err);
    res.status(500).json({ error: "Failed to mark alerts read", details: String(err) });
  }
});

export default router;