// backend/routes/payment.routes.js

import { Router } from "express";
import { createPayment } from "../controllers/payment.controller.js";
import { mercadopagoWebhook } from "../controllers/payment.webhook.js";

const router = Router();

/* =====================================================
CRIAR PAGAMENTO (CHECKOUT)
===================================================== */
router.post("/create", createPayment);

/* =====================================================
WEBHOOK MERCADO PAGO
===================================================== */
router.post("/webhook/mercadopago", mercadopagoWebhook);

/* =====================================================
PING PARA TESTAR A ROTA
===================================================== */
router.get("/webhook/mercadopago", (req, res) => {
  res.status(200).json({
    ok: true,
    route: "payment webhook mercadopago (GET ping)"
  });
});

export default router;