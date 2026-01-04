import { Router } from "express";

import healthRoutes from "./health.routes.js";
import productRoutes from "./product.routes.js";
import searchRoutes from "./search.routes.js";
import decisionRoutes from "./decision.routes.js";
import geoRoutes from "./geo.routes.js";
import authRoutes from "./auth.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/products", productRoutes);
router.use("/search", searchRoutes);
router.use("/decision", decisionRoutes);
router.use("/geo", geoRoutes);
router.use("/auth", authRoutes);

export default router;