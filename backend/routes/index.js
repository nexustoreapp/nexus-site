import { Router } from "express";
import healthRoutes from "./health.routes.js";
import plansRoutes from "./plans.routes.js";
import searchRoutes from "./search.routes.js";
import productRoutes from "./product.routes.js";
import chatRoutes from "./chat.routes.js"; // << ADICIONA

const router = Router();

router.use("/health", healthRoutes);
router.use("/plans", plansRoutes);
router.use("/search", searchRoutes);
router.use("/product", productRoutes);
router.use("/chat", chatRoutes); // << ADICIONA

export default router;
