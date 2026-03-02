// backend/routes/auth.routes.js
import { Router } from "express";
import {
  registerController,
  loginController,
  meController
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);

// ✅ rota que faltava pro front confirmar sessão
router.get("/me", requireAuth, meController);

export default router;