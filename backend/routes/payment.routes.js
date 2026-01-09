// backend/routes/payment.routes.js
import { Router } from "express";
import { createPayment } from "../controllers/payment.controller.js";
import { paymentWebhook } from "../controllers/payment.webhook.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/create", requireAuth, createPayment);
router.post("/webhook", paymentWebhook);

export default router;