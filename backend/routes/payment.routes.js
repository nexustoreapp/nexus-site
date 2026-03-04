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
WEBHOOK MERCADO PAGO (OFICIAL)
- Mercado Pago chama via POST aqui
===================================================== */
router.post("/webhook/mercadopago", mercadopagoWebhook);

/* =====================================================
DEBUG (GET) PARA TESTAR NO NAVEGADOR (SEM PAGAR DE NOVO)
- Só funciona se:
  1) tiver ?id=SEU_PAYMENT_ID
  2) tiver ?debug=SEU_WEBHOOK_DEBUG_KEY
- Configure no Render: WEBHOOK_DEBUG_KEY=uma_senha_forte
===================================================== */
router.get("/webhook/mercadopago", async (req, res) => {
  const paymentId = req.query?.id || req.query?.["data.id"] || null;
  const debug = String(req.query?.debug || "");

  const expected = process.env.WEBHOOK_DEBUG_KEY || "";

  // Se não tem ID, é ping
  if (!paymentId) {
    return res.status(200).json({
      ok: true,
      route: "payment webhook mercadopago (GET ping)"
    });
  }

  // Se não tem chave de debug configurada, bloqueia
  if (!expected) {
    return res.status(403).json({
      ok: false,
      error: "DEBUG_DISABLED",
      hint: "Defina WEBHOOK_DEBUG_KEY no Render para habilitar o teste GET"
    });
  }

  // Se chave errada, bloqueia
  if (debug !== expected) {
    return res.status(401).json({
      ok: false,
      error: "DEBUG_UNAUTHORIZED"
    });
  }

  // ✅ Com id + debug correto, roda o webhook real
  return mercadopagoWebhook(req, res);
});

export default router;