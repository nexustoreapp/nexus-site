// backend/routes/payment.routes.js
import { Router } from "express";
import { createPaymentController } from "../controllers/payment.controller.js";
import { mercadopagoWebhook } from "../controllers/payment.webhook.js";

const router = Router();

// /api/v1/payment
router.post("/create", createPaymentController);

// webhook público (não exige auth)
router.post("/webhook/mercadopago", mercadopagoWebhook);

export default router;