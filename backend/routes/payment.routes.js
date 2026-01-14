// backend/routes/payment.routes.js
import { Router } from "express";
import { createPayment } from "../controllers/payment.controller.js";
import { paymentWebhook } from "../controllers/payment.webhook.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { antiReplay } from "../middlewares/antiReplay.middleware.js";

const router = Router();

/*
  Pagamento protegido:
  - login obrigatório
  - nonce anti replay
*/
router.post("/create", requireAuth, antiReplay, createPayment);

/*
  Webhook NÃO usa auth nem antifraude
*/
router.post("/webhook", paymentWebhook);

export default router;