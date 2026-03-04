// backend/routes/payment.routes.js
import { Router } from "express";
import { createPayment } from "../controllers/payment.controller.js";
import { mercadopagoWebhook, reprocessPaymentAdmin } from "../controllers/payment.webhook.js";

const router = Router();

/* =====================================================
CRIAR PAGAMENTO (CHECKOUT)
===================================================== */
router.post("/create", createPayment);

/* =====================================================
WEBHOOK MERCADO PAGO (POST)
- Aceita /webhook e /webhook/mercadopago por compatibilidade
===================================================== */
router.post("/webhook", mercadopagoWebhook);
router.post("/webhook/mercadopago", mercadopagoWebhook);

/* =====================================================
PING (GET) PRA TESTAR ROTA
===================================================== */
router.get("/webhook", (req, res) => {
  res.status(200).json({ ok: true, route: "payment webhook (GET ping)" });
});
router.get("/webhook/mercadopago", (req, res) => {
  res.status(200).json({ ok: true, route: "payment webhook mercadopago (GET ping)" });
});

/* =====================================================
REPROCESSAR PAGAMENTO (ADMIN)
- Pra “rodar de novo” um pagamento antigo SEM pagar de novo.
- Protegido por header: X-Admin-Key
- URL: POST /payment/admin/reprocess/:paymentId
===================================================== */
router.post("/admin/reprocess/:paymentId", reprocessPaymentAdmin);

export default router;