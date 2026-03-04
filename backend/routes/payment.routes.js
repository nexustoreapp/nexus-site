// backend/routes/payment.routes.js

import { Router } from "express";
import { createPayment } from "../controllers/payment.controller.js";
import { mercadopagoWebhook } from "../controllers/payment.webhook.js";

const router = Router();

/* =====================================================
CRIAR PAGAMENTO (CHECKOUT)
POST /api/v1/payment/create
===================================================== */
router.post("/create", createPayment);

/* =====================================================
WEBHOOK MERCADO PAGO
POST /api/v1/payment/webhook/mercadopago
===================================================== */
router.post("/webhook/mercadopago", mercadopagoWebhook);

/* =====================================================
ALIAS (pra evitar confusão em testes)
POST /api/v1/payment/webhook
===================================================== */
router.post("/webhook", mercadopagoWebhook);

/* =====================================================
PING PARA TESTAR A ROTA (GET)
===================================================== */
router.get("/webhook/mercadopago", (req, res) => {
  res.status(200).json({
    ok: true,
    route: "payment webhook mercadopago (GET ping)"
  });
});

router.get("/webhook", (req, res) => {
  res.status(200).json({
    ok: true,
    route: "payment webhook (GET ping)"
  });
});

export default router;