import { Router } from "express";
import { decisionController } from "../controllers/decision.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// 🔒 TODAS AS ROTAS PROTEGIDAS POR JWT
router.get("/recommend", requireAuth, decisionController.recommend);
router.get("/get", requireAuth, decisionController.get);
router.get("/list", requireAuth, decisionController.list);

export default router;