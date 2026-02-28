import { Router } from "express";
import { createPaymentController } from "../controllers/payment.controller.js";
import { paymentWebhook } from "../controllers/payment.webhook.js";

const router = Router();

router.post("/create", createPaymentController);
router.post("/webhook", paymentWebhook);

export default router;