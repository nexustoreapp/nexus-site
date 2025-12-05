// backend/routes/index.js

import { Router } from "express";
import healthRoutes from "./health.routes.js";
import plansRoutes from "./plans.routes.js";
import searchRoutes from "./search.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/plans", plansRoutes);
router.use("/search", searchRoutes);

export default router;
