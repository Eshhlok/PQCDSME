import { Router, type IRouter } from "express";
import { db } from "../lib/db";
import { shiftsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/shifts?plantId=1
router.get("/shifts", async (req, res) => {
  try {
    const { plantId } = req.query;
    const rows = await db
      .select()
      .from(shiftsTable)
      .where(eq(shiftsTable.plantId, Number(plantId)))
      .orderBy(shiftsTable.startTime);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch shifts", details: String(err) });
  }
});

// POST /api/shifts  — admin only
router.post("/shifts", async (req, res) => {
  try {
    const { role } = (req as any).user ?? {};
    if (role !== "admin") return res.status(403).json({ error: "Admin only" });

    const { plantId, name, startTime, endTime } = req.body;
    if (!plantId || !name || !startTime || !endTime) {
      return res.status(400).json({ error: "plantId, name, startTime, endTime required" });
    }

    const [row] = await db
      .insert(shiftsTable)
      .values({ plantId: Number(plantId), name, startTime, endTime })
      .returning();
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create shift", details: String(err) });
  }
});

// PATCH /api/shifts/:id  — admin only
router.patch("/shifts/:id", async (req, res) => {
  try {
    const { role } = (req as any).user ?? {};
    if (role !== "admin") return res.status(403).json({ error: "Admin only" });

    const { name, startTime, endTime } = req.body;
    const [row] = await db
      .update(shiftsTable)
      .set({ ...(name ? { name } : {}), ...(startTime ? { startTime } : {}), ...(endTime ? { endTime } : {}) })
      .where(eq(shiftsTable.id, Number(req.params.id)))
      .returning();
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update shift", details: String(err) });
  }
});

// DELETE /api/shifts/:id  — admin only
router.delete("/shifts/:id", async (req, res) => {
  try {
    const { role } = (req as any).user ?? {};
    if (role !== "admin") return res.status(403).json({ error: "Admin only" });

    await db.delete(shiftsTable).where(eq(shiftsTable.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete shift", details: String(err) });
  }
});

export default router;