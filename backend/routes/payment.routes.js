// backend/routes/payment.routes.js
import { Router } from "express";
import { createPayment } from "../controllers/payment.controller.js";
import { mercadopagoWebhook } from "../controllers/payment.webhook.js";

const router = Router();

// criar pagamento
router.post("/create", createPayment);

// webhook oficial (MP chama POST)
router.post("/webhook/mercadopago", mercadopagoWebhook);

// ✅ teste manual (você no navegador com ?id=...)
router.get("/webhook/mercadopago", mercadopagoWebhook);

export default router;