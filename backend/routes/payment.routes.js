// backend/routes/payment.routes.js
import { Router } from "express";
import { createPaymentController } from "../controllers/payment.controller.js";
import { mercadopagoWebhook } from "../controllers/payment.webhook.js";

const router = Router();

// cria preference (checkout)
router.post("/create", createPaymentController);

// webhook REAL (Mercado Pago chama via POST)
router.post("/webhook/mercadopago", mercadopagoWebhook);

// ping de teste (pra você abrir no navegador e ver se a rota existe)
router.get("/webhook/mercadopago", (req, res) => {
  res.status(200).json({ ok: true, route: "payment webhook mercadopago (GET ping)" });
});

export default router;