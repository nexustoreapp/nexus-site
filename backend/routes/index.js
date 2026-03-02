import { Router } from "express";

import healthRoutes from "./health.routes.js";
import productRoutes from "./product.routes.js";
import searchRoutes from "./search.routes.js";
import decisionRoutes from "./decision.routes.js";
import geoRoutes from "./geo.routes.js";
import authRoutes from "./auth.routes.js";
import checkoutRoutes from "./checkout.routes.js";
import paymentRoutes from "./payment.routes.js";
import ordersRoutes from "./orders.routes.js";
import trackingRoutes from "./tracking.routes.js";

const router = Router();

// versão v1 da API
router.use("/v1/health", healthRoutes);
router.use("/v1/products", productRoutes);
router.use("/v1/search", searchRoutes);
router.use("/v1/decision", decisionRoutes);
router.use("/v1/geo", geoRoutes);
router.use("/v1/auth", authRoutes);
router.use("/v1/checkout", checkoutRoutes);
router.use("/v1/payment", paymentRoutes);
router.use("/v1/orders", ordersRoutes);
router.use("/v1/tracking", trackingRoutes);

export default router;