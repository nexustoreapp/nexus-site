import { Router } from "express";

import healthRoutes from "./health.routes.js";
import plansRoutes from "./plans.routes.js";
import productRoutes from "./product.routes.js";
import searchRoutes from "./search.routes.js";
import chatRoutes from "./chat.routes.js";
import robotRoutes from "./robot.routes.js";
import trackingRoutes from "./tracking.routes.js";
import liveRoutes from "./live.routes.js";
import shopifyRoutes from "./shopify.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/plans", plansRoutes);
router.use("/products", productRoutes);
router.use("/search", searchRoutes);
router.use("/chat", chatRoutes);
router.use("/robot", robotRoutes);
router.use("/tracking", trackingRoutes);
router.use("/live", liveRoutes);
router.use("/shopify", shopifyRoutes);

export default router;