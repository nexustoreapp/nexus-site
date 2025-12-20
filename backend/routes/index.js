import { Router } from "express";

import healthRoutes from "./health.routes.js";
import plansRoutes from "./plans.routes.js";
import productRoutes from "./product.routes.js";
import searchRoutes from "./search.routes.js";
import chatRoutes from "./chat.routes.js";

const router = Router();

// Health check
router.use("/health", healthRoutes);

// Planos
router.use("/plans", plansRoutes);

// Produtos
router.use("/products", productRoutes);

// Busca
router.use("/search", searchRoutes);

// Chat
router.use("/chat", chatRoutes);

export default router;
