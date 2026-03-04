// backend/routes/payment.routes.js

import express from "express";
import { mercadopagoWebhook } from "../controllers/payment.webhook.js";

const router = express.Router();

/* webhook mercado pago */
router.post("/payment/webhook", mercadopagoWebhook);

export default router;