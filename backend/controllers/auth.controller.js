import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import { isValidCPF, onlyDigits } from "../utils/cpf.js";
import { findUserByEmail, findUserByCPF, upsertUser } from "../utils/userStore.js";

/* ============================
   CONFIG FIXA (DEFINITIVO)
============================ */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

// reCAPTCHA
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

// EMAIL
const FROM_EMAIL = "Nexus <no-reply@nexustore.store>";

/* ============================
   HELPERS
============================ */
function strongPassword(pw) {
  // mínimo 8, maiúscula, minúscula, número e símbolo
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(pw);
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
    const t = await r.text();
    console.error("[RESEND ERROR]", t);
    throw new Error("EMAIL_SEND_FAILED");
  }
}

/* ============================
   REGISTER
============================ */
export async function register(req, res) {
  try {
    const { email, password, cpf, captcha } = req.body || {};

    if (!email || !password || !cpf || !captcha) {
      return res.status(400).json({ ok: false, error: "INVALID_DATA" });
    }

    if (!strongPassword(password)) {
      return res.status(400).json({
        ok: false,
        error: "WEAK_PASSWORD"
      });
    }

    const captchaOk = await verifyCaptcha(captcha);
    if (!captchaOk) {
      return res.status(403).json({ ok: false, error: "CAPTCHA_INVALID" });
    }

    const cpfClean = onlyDigits(cpf);
    if (!isValidCPF(cpfClean)) {
      return res.status(400).json({ ok: false, error: "CPF_INVALID" });
    }

    const cpfOwner = findUserByCPF(cpfClean);
    if (cpfOwner && cpfOwner.email !== email) {
      return res.status(409).json({ ok: false, error: "CPF_EXISTS" });
    }

    let user = findUserByEmail(email);
    if (user && user.verified) {
      return res.status(409).json({ ok: false, error: "USER_EXISTS" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();

    if (!user) {
      const hash = await bcrypt.hash(password, 10);
      user = {
        id: now.toString(),
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
      user.otp = otp;
      user.otpCreatedAt = now;
      user.updatedAt = now;
    }

    upsertUser(user);
    await sendOtp(email, otp);

    return res.json({ ok: true, message: "OTP_SENT" });

  } catch (err) {
    console.error("[REGISTER ERROR]", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/* ============================
   VERIFY OTP
============================ */
export function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
      return res.status(400).json({ ok: false, error: "INVALID_DATA" });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ ok: false, error: "USER_NOT_FOUND" });
    }

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
    console.error("[VERIFY OTP ERROR]", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

/* ============================
   LOGIN
============================ */
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "INVALID_DATA" });
    }

    const user = findUserByEmail(email);
    if (!user || !user.verified) {
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, cpf: user.cpf, plan: user.plan },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ ok: true, token });

  } catch (err) {
    console.error("[LOGIN ERROR]", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}