import { Router } from "express";
import { createPaymentController } from "../controllers/payment.controller.js";
import { mercadopagoWebhook } from "../controllers/payment.webhook.js";

const router = Router();

router.post("/create", createPaymentController);
router.post("/webhook", mercadopagoWebhook);

export default router;