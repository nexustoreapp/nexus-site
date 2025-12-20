import { Router } from "express";

import healthRoutes from "./health.routes.js";
import plansRoutes from "./plans.routes.js";
import productRoutes from "./product.routes.js";
import searchRoutes from "./search.routes.js";
import chatRoutes from "./chat.routes.js";

const router = Router();

console.log("[NEXUS] Loading API routes...");

// health
router.use("/health", healthRoutes);

// plans
router.use("/plans", plansRoutes);

// products
router.use("/products", productRoutes);

// 🔥 SEARCH (ESSA É A ROTA QUE ESTÁ FALTANDO)
router.use("/search", searchRoutes);

// chat
router.use("/chat", chatRoutes);

console.log("[NEXUS] Search route enabled at /api/search");

export default router;
