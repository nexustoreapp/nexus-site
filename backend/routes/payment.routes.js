import { Router } from "express";
import { createPayment } from "../controllers/payment.controller.js";
import { paymentWebhook } from "../controllers/payment.webhook.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { paymentLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

router.post("/create", requireAuth, paymentLimiter, createPayment);
router.post("/webhook", paymentWebhook);

export default router;