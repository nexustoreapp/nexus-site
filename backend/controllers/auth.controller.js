// backend/controllers/auth.controller.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import { isValidCPF, onlyDigits } from "../utils/cpf.js";
import { findUserByEmail, findUserByCPF, upsertUser } from "../utils/userStore.js";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.SMTP_FROM || "Nexus <onboarding@resend.dev>";

function requireEnv(name, value) {
  if (!value) throw new Error(`ENV faltando: ${name}`);
}

async function sendOtp(email, otp) {
  requireEnv("RESEND_API_KEY", RESEND_API_KEY);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: "Nexus — Código de verificação",
      html: `<p>Seu código de verificação é:</p><h2>${otp}</h2>`
    })
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("[RESEND ERROR]", t);
    return false;
  }
  return true;
}

// REGISTER
export async function register(req, res) {
  try {
    const { email, password, cpf } = req.body || {};
    if (!email || !password || !cpf) {
      return res.status(400).json({ ok: false, error: "INVALID_DATA" });
    }

    const cpfClean = onlyDigits(cpf);
    if (!isValidCPF(cpfClean)) {
      return res.status(400).json({ ok: false, error: "CPF_INVALID" });
    }

    // CPF único
    const cpfOwner = findUserByCPF(cpfClean);
    if (cpfOwner && cpfOwner.email !== email) {
      return res.status(409).json({ ok: false, error: "CPF_EXISTS" });
    }

    let user = findUserByEmail(email);

    // Se já existe e já verificado, não registra de novo
    if (user && user.verified) {
      return res.status(409).json({ ok: false, error: "USER_ALREADY_VERIFIED" });
    }

    // cria/atualiza usuário pendente
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();

    if (!user) {
      const hash = await bcrypt.hash(password, 10);
      user = {
        id: String(now),
        email,
        cpf: cpfClean,
        password: hash,
        verified: false,
        plan: "free",
        otp,
        otpCreatedAt: now,
        createdAt: now,
        updatedAt: now
      };
    } else {
      // já existe, mas não verificado: atualiza cpf e gera novo otp
      user.cpf = cpfClean;
      user.otp = otp;
      user.otpCreatedAt = now;
      user.updatedAt = now;
    }

    upsertUser(user);

    // responde rápido
    res.json({ ok: true, message: "OTP_SENT" });

    // envia em background (não trava UX)
    await sendOtp(email, otp);

  } catch (err) {
    console.error("[AUTH REGISTER ERROR]", err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// VERIFY OTP
export function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) return res.status(400).json({ ok: false, error: "INVALID_DATA" });

    const user = findUserByEmail(email);
    if (!user) return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });

    if (user.otp !== String(otp)) {
      return res.status(400).json({ ok: false, error: "OTP_INVALID" });
    }

    user.verified = true;
    user.otp = null;
    user.otpCreatedAt = null;
    user.updatedAt = Date.now();
    upsertUser(user);

    return res.json({ ok: true });
  } catch (err) {
    console.error("[AUTH VERIFY ERROR]", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// LOGIN
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, error: "INVALID_DATA" });

    const user = findUserByEmail(email);
    if (!user) return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    if (!user.verified) return res.status(401).json({ ok: false, error: "NOT_VERIFIED" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });

    const token = jwt.sign(
      { email: user.email, cpf: user.cpf, plan: user.plan, id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ ok: true, token });
  } catch (err) {
    console.error("[AUTH LOGIN ERROR]", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}