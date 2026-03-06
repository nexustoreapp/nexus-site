import { Router } from "express";
import { prepareCheckout } from "../controllers/checkout.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/prepare", authMiddleware, prepareCheckout);

export default router;