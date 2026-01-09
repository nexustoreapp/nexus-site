import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import { isValidCPF, onlyDigits } from "../utils/cpf.js";
import { findUserByEmail, findUserByCPF, upsertUser } from "../utils/userStore.js";

/* =====================================
   reCAPTCHA (CHAVE FIXA NO CÓDIGO)
===================================== */
const RECAPTCHA_SECRET = "6Lfu50QsAAAAAKiztz9gEGcQS1IJFuw1P5d18QhO";

async function verifyCaptcha(token) {
  if (!token) return false;

  const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${RECAPTCHA_SECRET}&response=${token}`
  });

  const d = await r.json();
  return d.success === true;
}

/* =====================================
   REGISTER
===================================== */
export async function register(req, res) {
  try {
    const { email, password, cpf, captcha } = req.body || {};

    if (!email || !password || !cpf || !captcha) {
      return res.status(400).json({ ok:false, error:"INVALID_DATA" });
    }

    // CAPTCHA
    const captchaOk = await verifyCaptcha(captcha);
    if (!captchaOk) {
      return res.status(403).json({ ok:false, error:"CAPTCHA_INVALID" });
    }

    // SENHA FORTE
    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(password)) {
      return res.status(400).json({
        ok:false,
        error:"WEAK_PASSWORD"
      });
    }

    const cpfClean = onlyDigits(cpf);
    if (!isValidCPF(cpfClean)) {
      return res.status(400).json({ ok:false, error:"CPF_INVALID" });
    }

    const cpfOwner = findUserByCPF(cpfClean);
    if (cpfOwner && cpfOwner.email !== email) {
      return res.status(409).json({ ok:false, error:"CPF_EXISTS" });
    }

    if (findUserByEmail(email)) {
      return res.status(409).json({ ok:false, error:"USER_EXISTS" });
    }

    const hash = await bcrypt.hash(password, 10);
    const now = Date.now();

    const user = {
      id: String(now),
      email,
      cpf: cpfClean,
      password: hash,
      verified: true, // OTP DESATIVADO
      plan: "free",
      createdAt: now,
      updatedAt: now
    };

    upsertUser(user);
    return res.json({ ok:true });

  } catch (err) {
    console.error("[REGISTER ERROR]", err);
    return res.status(500).json({ ok:false, error:"SERVER_ERROR" });
  }
}

/* =====================================
   LOGIN
===================================== */
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok:false, error:"INVALID_DATA" });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ ok:false, error:"INVALID_CREDENTIALS" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ ok:false, error:"INVALID_CREDENTIALS" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        cpf: user.cpf,
        plan: user.plan
      },
      "NEXUS_SUPER_SECRET_JWT_KEY",
      { expiresIn: "7d" }
    );

    return res.json({ ok:true, token });

  } catch (err) {
    console.error("[LOGIN ERROR]", err);
    return res.status(500).json({ ok:false, error:"SERVER_ERROR" });
  }
}

/* =====================================
   OTP DESATIVADO
===================================== */
export function verifyOtp(req, res) {
  return res.status(410).json({ ok:false, error:"OTP_DISABLED" });
}