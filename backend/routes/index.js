import { Router } from "express";

import healthRoutes from "./health.routes.js";
import plansRoutes from "./plans.routes.js";
import productRoutes from "./product.routes.js";
import searchRoutes from "./search.routes.js";
import chatRoutes from "./chat.routes.js";

console.log("[NEXUS] routes/index.js CARREGOU");

const router = Router();

router.use("/health", healthRoutes);
router.use("/plans", plansRoutes);
router.use("/products", productRoutes);
router.use("/search", searchRoutes);
router.use("/chat", chatRoutes);

console.log("[NEXUS] Search ON at /api/search");
console.log("[NEXUS] routes/index.js TERMINOU");

export default router;
