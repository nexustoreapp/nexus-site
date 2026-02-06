// backend/routes/orders.routes.js
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  listMyOrders,
  getOrder
} from "../controllers/orders.controller.js";

const router = Router();

router.get("/", requireAuth, listMyOrders);
router.get("/:id", requireAuth, getOrder);

export default router;