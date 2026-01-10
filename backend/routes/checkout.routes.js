// backend/routes/checkout.routes.js
import { Router } from "express";
import { prepareCheckout } from "../controllers/checkout.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js"; // ✅ PLURAL

const router = Router();

router.post("/prepare", requireAuth, prepareCheckout);

export default router;