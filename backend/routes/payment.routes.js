// backend/routes/payment.routes.js
import { Router } from "express";
import { createPayment } from "../controllers/payment.controller.js";
import { paymentWebhook } from "../controllers/payment.webhook.js";
import { requireAuth } from "../middlewares/auth.middleware.js"; // ✅ PLURAL

const router = Router();

// cria pagamento (usuário logado)
router.post("/create", requireAuth, createPayment);

// webhook do gateway (não usa auth)
router.post("/webhook", paymentWebhook);

export default router;