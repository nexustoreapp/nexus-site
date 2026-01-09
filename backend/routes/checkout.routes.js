// backend/routes/checkout.routes.js
import { Router } from "express";
import { prepareCheckout } from "../controllers/checkout.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * Prepara checkout
 * 🔒 Só usuário logado
 */
router.post("/prepare", requireAuth, prepareCheckout);

export default router;