import { Router, type IRouter } from "express";
import { db } from "../lib/db";
import { targetsTable } from "@workspace/db/schema";
import { CreateTargetBody, GetTargetsQueryParams } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/targets", async (req, res) => {
  try {
    const query = GetTargetsQueryParams.parse(req.query);
    const conditions = [eq(targetsTable.plantId, query.plantId)];
    if (query.section) conditions.push(eq(targetsTable.section, query.section));
    if (query.month) conditions.push(eq(targetsTable.month, query.month));
    if (query.year) conditions.push(eq(targetsTable.year, query.year));
    const targets = await db.select().from(targetsTable).where(and(...conditions));
    res.json(targets);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch targets" });
  }
});

router.post("/targets", async (req, res) => {
  try {
    const input = CreateTargetBody.parse(req.body);
    const [target] = await db.insert(targetsTable).values({
      ...input,
      targetValue: String(input.targetValue),
    }).returning();
    res.status(201).json(target);
  } catch (err) {
    res.status(400).json({ error: "Invalid input" });
  }
});

export default router;