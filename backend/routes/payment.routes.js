// backend/routes/payment.routes.js
import { Router } from "express";
import { createPayment } from "../controllers/payment.controller.js";
import { paymentWebhook } from "../controllers/payment.webhook.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { paymentLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

// cria pagamento (usuário logado)
router.post("/create", requireAuth, paymentLimiter, createPayment);

// webhook do gateway (sem auth / sem rate limit)
router.post("/webhook", paymentWebhook);

export default router;