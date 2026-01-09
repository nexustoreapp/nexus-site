import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import { isValidCPF, onlyDigits } from "../utils/cpf.js";
import { findUserByEmail, findUserByCPF, upsertUser } from "../utils/userStore.js";

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.SMTP_FROM;

async function verifyCaptcha(token) {
  const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${RECAPTCHA_SECRET}&response=${token}`
  });
  const d = await r.json();
  return d.success === true;
}

async function sendWelcomeEmail(email) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: "Bem-vindo ao Nexus 🚀",
      html: `
        <h2>Conta criada com sucesso</h2>
        <p>Seu cadastro no <strong>Nexus</strong> foi concluído.</p>
        <p>Agora você já pode fazer login normalmente.</p>
      `
    })
  });

  if (!r.ok) {
    console.error("[RESEND ERROR]", await r.text());
  }
}

/* =========================
   REGISTER (CAPTCHA + EMAIL)
========================= */
export async function register(req, res) {
  try {
    const { email, password, cpf, captcha } = req.body || {};
    if (!email || !password || !cpf || !captcha) {
      return res.status(400).json({ ok:false, error:"INVALID_DATA" });
    }

    const captchaOk = await verifyCaptcha(captcha);
    if (!captchaOk) {
      return res.status(403).json({ ok:false, error:"CAPTCHA_INVALID" });
    }

    if (password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/[0-9]/.test(password)) {
      return res.status(400).json({
        ok:false,
        error:"WEAK_PASSWORD"
      });
    }

    const cpfClean = onlyDigits(cpf);
    if (!isValidCPF(cpfClean)) {
      return res.status(400).json({ ok:false, error:"CPF_INVALID" });
    }

    if (findUserByCPF(cpfClean)) {
      return res.status(409).json({ ok:false, error:"CPF_EXISTS" });
    }

    if (findUserByEmail(email)) {
      return res.status(409).json({ ok:false, error:"USER_EXISTS" });
    }

    const hash = await bcrypt.hash(password, 10);
    const now = Date.now();

    upsertUser({
      id: String(now),
      email,
      cpf: cpfClean,
      password: hash,
      verified: true,
      plan: "free",
      createdAt: now,
      updatedAt: now
    });

    await sendWelcomeEmail(email);

    return res.json({ ok:true });

  } catch (err) {
    console.error("[REGISTER ERROR]", err);
    return res.status(500).json({ ok:false, error:"SERVER_ERROR" });
  }
}

/* =========================
   LOGIN
========================= */
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
      { id:user.id, email:user.email, cpf:user.cpf, plan:user.plan },
      process.env.JWT_SECRET,
      { expiresIn:"7d" }
    );

    return res.json({ ok:true, token });

  } catch (err) {
    console.error("[LOGIN ERROR]", err);
    return res.status(500).json({ ok:false, error:"SERVER_ERROR" });
  }
}