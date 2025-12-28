import { Router } from "express";

import healthRoutes from "./health.routes.js";
import plansRoutes from "./plans.routes.js";
import productRoutes from "./product.routes.js";
import searchRoutes from "./search.routes.js";
import chatRoutes from "./chat.routes.js";

import dropshipRoutes from "./dropship.routes.js"; // se você já tinha
import robotRoutes from "./robot.routes.js";
import supplierMapRoutes from "./supplierMap.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/plans", plansRoutes);
router.use("/products", productRoutes);
router.use("/search", searchRoutes);
router.use("/chat", chatRoutes);

// CJ (se quiser manter)
router.use("/dropship", dropshipRoutes);

// Robô-Gerente
router.use("/robot", robotRoutes);

// Mapa de SKU (mão dupla)
router.use("/supplier-map", supplierMapRoutes);

export default router;
