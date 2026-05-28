import { Router, type IRouter } from "express";
import { db } from "../lib/db";
import { entriesTable } from "@workspace/db/schema";
import { CreateEntryBody, GetEntriesQueryParams } from "@workspace/api-zod";
import { eq, and, gte, lte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/entries", async (req, res) => {
  try {
    const query = GetEntriesQueryParams.parse(req.query);
    const conditions = [eq(entriesTable.plantId, query.plantId)];
    if (query.section) conditions.push(eq(entriesTable.section, query.section));
    if (query.startDate) conditions.push(gte(entriesTable.entryDate, query.startDate));
    if (query.endDate) conditions.push(lte(entriesTable.entryDate, query.endDate));
    const entries = await db.select().from(entriesTable).where(and(...conditions));
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

router.post("/entries", async (req, res) => {
  try {
    const input = CreateEntryBody.parse(req.body);
    const [entry] = await db.insert(entriesTable).values({
      ...input,
      fieldValue: String(input.fieldValue),
    }).returning();
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: "Invalid input" });
  }
});

export default router;