import { Router } from "express";
import { listUserOrders } from "../controllers/orders.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, listUserOrders);

export default router;