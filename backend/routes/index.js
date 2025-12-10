// backend/routes/index.js

import { Router } from "express";
import healthRoutes from "./health.routes.js";
import plansRoutes from "./plans.routes.js";
import searchRoutes from "./search.routes.js";

const router = Router();

// /api/health
router.use("/health", healthRoutes);

// /api/plans
router.use("/plans", plansRoutes);

// /api/search
router.use("/search", searchRoutes);

// /api/product
router.use("/product", productRoutes);

export default router;
