import { Router, type IRouter } from "express";
import { db } from "../lib/db";
import { insightsTable } from "@workspace/db/schema";
import { CreateInsightBody, GetInsightsQueryParams } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/insights", async (req, res) => {
  try {
    const query = GetInsightsQueryParams.parse(req.query);
    const conditions = [eq(insightsTable.plantId, query.plantId)];
    if (query.section) conditions.push(eq(insightsTable.section, query.section));
    if (query.chartType) conditions.push(eq(insightsTable.chartType, query.chartType));
    const insights = await db.select().from(insightsTable).where(and(...conditions));
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch insights" });
  }
});

router.post("/insights", async (req, res) => {
  try {
    const input = CreateInsightBody.parse(req.body);
    const [insight] = await db.insert(insightsTable).values(input).returning();
    res.status(201).json(insight);
  } catch (err) {
    res.status(400).json({ error: "Invalid input" });
  }
});

export default router;