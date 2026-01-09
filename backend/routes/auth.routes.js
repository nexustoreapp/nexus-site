// backend/routes/auth.routes.js
import express from "express";
import { register, login } from "../controllers/auth.controller.js";

const router = express.Router();

// REGISTRO COM CAPTCHA (SEM OTP)
router.post("/register", register);

// LOGIN NORMAL
router.post("/login", login);

export default router;