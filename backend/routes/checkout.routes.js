// backend/routes/checkout.routes.js
import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { checkoutController } from "../controllers/checkout.controller.js";

const router = Router();

router.post("/create", requireAuth, checkoutController.create);
router.post("/webhook", checkoutController.webhook);

export default router;