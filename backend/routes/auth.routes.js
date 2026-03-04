// backend/routes/auth.routes.js
import { Router } from "express";

import {
  registerController,
  loginController,
  meController
} from "../controllers/auth.controller.js";

import { requireAuth } from "../middlewares/auth.middleware.js";
import { deleteAccount } from "../controllers/deleteAccount.controller.js";

const router = Router();

/* =====================================
REGISTER
===================================== */
router.post("/register", registerController);

/* =====================================
LOGIN
===================================== */
router.post("/login", loginController);

/* =====================================
CONFIRMAR SESSÃO
===================================== */
router.get("/me", requireAuth, meController);

/* =====================================
DELETAR CONTA
===================================== */
router.delete("/delete", requireAuth, deleteAccount);

export default router;