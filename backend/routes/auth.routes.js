import express from "express";
import {
  register,
  verifyOtp,
  login,
  confirmLogin
} from "../controllers/auth.controller.js";

const router = express.Router();

/*
 FLUXO CORRETO:

 1) REGISTER
    POST /api/auth/register
    → cria conta + envia OTP

 2) VERIFY REGISTER OTP
    POST /api/auth/verify-otp
    → ativa conta

 3) LOGIN
    POST /api/auth/login
    → valida senha + envia OTP

 4) CONFIRM LOGIN
    POST /api/auth/confirm-login
    → gera JWT
*/

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/confirm-login", confirmLogin);

export default router;