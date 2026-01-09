import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import { isValidCPF, onlyDigits } from "../utils/cpf.js";
import { findUserByEmail, findUserByCPF, upsertUser } from "../utils/userStore.js";

/* ===============================
   CONFIG
================================ */
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = "Nexus <no-reply@nexustore.store>";

/* ===============================
   HELPERS
================================ */
function isStrongPassword(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

async function verifyCaptcha(token) {
  const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${RECAPTCHA_SECRET}&response=${token}`
  });
  const d = await r.json();
  return d.success === true;
}

async function sendOtp(email, otp) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: "Nexus — Código de verificação",
      html: `<p>Seu código de verificação:</p><h2>${otp}</h2>`
    })
  });

  if (!r.ok) {
    console.error("[RESEND ERROR]", await r.text());
    return false;
  }
  return true;
}

/* ===============================
   REGISTER
================================ */
export async function register(req, res) {
  try {
    const { email, password, cpf, captcha } = req.body || {};

    if (!email || !password || !cpf || !captcha) {
      return res.status(400).json({ ok: false, error: "INVALID_DATA" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ ok: false, error: "WEAK_PASSWORD" });
    }

    const captchaOk = await verifyCaptcha(captcha);
    if (!captchaOk) {
      return res.status(403).json({ ok: false, error: "CAPTCHA_INVALID" });
    }

    const cpfClean = onlyDigits(cpf);
    if (!isValidCPF(cpfClean)) {
      return res.status(400).json({ ok: false, error: "CPF_INVALID" });
    }

    if (findUserByEmail(email)) {
      return res.status(409).json({ ok: false, error: "USER_EXISTS" });
    }

    if (findUserByCPF(cpfClean)) {
      return res.status(409).json({ ok: false, error: "CPF_EXISTS" });
    }

    const hash = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();

    const user = {
      id: String(now),
      email,
      cpf: cpfClean,
      password: hash,
      verified: false,
      plan: "free",
      otp,
      otpAt: now,
      createdAt: now,
      updatedAt: now
    };

    upsertUser(user);
    await sendOtp(email, otp);

    return res.json({ ok: true, step: "OTP_SENT" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/* ===============================
   VERIFY OTP
================================ */
export function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body || {};
    const user = findUserByEmail(email);

    if (!user || user.otp !== otp) {
      return res.status(400).json({ ok: false, error: "OTP_INVALID" });
    }

    user.verified = true;
    user.otp = null;
    user.updatedAt = Date.now();
    upsertUser(user);

    return res.json({ ok: true });

  } catch (err) {
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/* ===============================
   LOGIN (2FA)
================================ */
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    const user = findUserByEmail(email);

    if (!user || !user.verified) {
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpAt = Date.now();
    upsertUser(user);

    await sendOtp(email, otp);

    return res.json({ ok: true, step: "OTP_REQUIRED" });

  } catch (err) {
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/* ===============================
   LOGIN CONFIRM
================================ */
export function confirmLogin(req, res) {
  try {
    const { email, otp } = req.body || {};
    const user = findUserByEmail(email);

    if (!user || user.otp !== otp) {
      return res.status(401).json({ ok: false, error: "OTP_INVALID" });
    }

    user.otp = null;
    upsertUser(user);

    const token = jwt.sign(
      { id: user.id, email: user.email, plan: user.plan },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ ok: true, token });

  } catch {
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}