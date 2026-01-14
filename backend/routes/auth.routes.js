// backend/routes/auth.routes.js
import { Router } from "express";
import { register, login } from "../controllers/auth.controller.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

// Registro
router.post("/register", authLimiter, register);

// Login
router.post("/login", authLimiter, login);

export default router;