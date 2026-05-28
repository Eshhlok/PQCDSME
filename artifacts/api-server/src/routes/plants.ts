import { Router, type IRouter } from "express";
import { db } from "../lib/db";
import { plantsTable } from "@workspace/db/schema";
import { CreatePlantBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/plants", async (_req, res) => {
  try {
    const plants = await db.select().from(plantsTable);
    res.json(plants);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch plants" });
  }
});

router.post("/plants", async (req, res) => {
  try {
    const input = CreatePlantBody.parse(req.body);
    const [plant] = await db.insert(plantsTable).values(input).returning();
    res.status(201).json(plant);
  }catch (err: any) {
    console.error("Full error:", err);
    res.status(400).json({ error: String(err), details: err?.cause || err?.message });
  }
});

export default router;