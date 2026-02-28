// backend/routes/tracking.routes.js
import { Router } from "express";
import { getTrackingController } from "../controllers/tracking.controller.js";

const router = Router();

// /api/v1/tracking/:orderId
router.get("/:orderId", getTrackingController);

export default router;