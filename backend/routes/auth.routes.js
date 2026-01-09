// backend/routes/auth.routes.js
import { Router } from "express";
import { register, login } from "../controllers/auth.controller.js";

const router = Router();

/**
 * Registro de usuário
 */
router.post("/register", register);

/**
 * Login do usuário
 */
router.post("/login", login);

export default router;