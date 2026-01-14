// backend/routes/orders.routes.js
import { Router } from "express";
import { getMyOrders } from "../controllers/orders.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// histórico do usuário logado
router.get("/my", requireAuth, getMyOrders);

export default router;