import { Router, type IRouter } from "express";
import healthRouter from "./health";
import plantsRouter from "./plants";
import entriesRouter from "./entries";
import targetsRouter from "./targets";
import insightsRouter from "./insights";
import statsRouter from "./stats";
import adminRouter from "./admin";
import { requireAuth, scopeToPlant } from "../middleware/auth";

const router: IRouter = Router();

// Health check — no auth
router.use(healthRouter);

// All routes below require valid JWT
router.use(requireAuth);

// Scope non-admins to their plant — applied globally before all data routers
router.use(scopeToPlant);

// All routers define their own full path prefixes internally
router.use(entriesRouter);
router.use(targetsRouter);
router.use(insightsRouter);
router.use(statsRouter);
router.use(plantsRouter);
router.use("/admin", adminRouter);

export default router;