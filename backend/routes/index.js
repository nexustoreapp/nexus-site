import { Router } from "express";

import healthRoutes from "./health.routes.js";
import productRoutes from "./product.routes.js";
import searchRoutes from "./search.routes.js";
import decisionRoutes from "./decision.routes.js";
import geoRoutes from "./geo.routes.js";

const router = Router();

// Rotas ativas (fonte única: catálogo JSON)
router.use("/health", healthRoutes);
router.use("/products", productRoutes);
router.use("/search", searchRoutes);
router.use("/decision", decisionRoutes);
router.use("/geo", geoRoutes);

export default router;