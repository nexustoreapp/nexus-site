// backend/controllers/auth.controller.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { isValidCPF, onlyDigits } from "../utils/cpf.js";
import { findUserByEmail, findUserByCPF, upsertUser } from "../utils/userStore.js";
import { verifyRecaptchaToken } from "../utils/recaptcha.js";

const JWT_SECRET = process.env.JWT_SECRET;

function isStrongPassword(p) {
  return (
    typeof p === "string" &&
    p.length >= 8 &&
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /\d/.test(p) &&
    /[^A-Za-z0-9]/.test(p)
  );
}

export async function register(req, res) {
  try {
    const { email, password, cpf, captcha } = req.body || {};

    if (!email || !password || !cpf || !captcha) {
      return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ ok: false, error: "WEAK_PASSWORD" });
    }

    const captchaOk = await verifyRecaptchaToken(captcha);
    if (!captchaOk) {
      return res.status(403).json({ ok: false, error: "CAPTCHA_INVALID" });
    }

    const cpfClean = onlyDigits(cpf);
    if (!isValidCPF(cpfClean)) {
      return res.status(400).json({ ok: false, error: "CPF_INVALID" });
    }

    if (findUserByCPF(cpfClean) || findUserByEmail(email)) {
      return res.status(409).json({ ok: false, error: "USER_EXISTS" });
    }

    const hash = await bcrypt.hash(password, 10);
    const now = Date.now();

    upsertUser({
      id: String(now),
      email,
      cpf: cpfClean,
      password: hash,
      plan: "free",
      verified: true,
      createdAt: now,
      updatedAt: now
    });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "REGISTER_FAIL" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    const user = findUserByEmail(email);

    if (!user) return res.status(401).json({ ok: false, error: "INVALID_LOGIN" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ ok: false, error: "INVALID_LOGIN" });

    if (!JWT_SECRET) {
      return res.status(500).json({ ok: false, error: "JWT_SECRET_MISSING" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, cpf: user.cpf, plan: user.plan },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ ok: true, token });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "LOGIN_FAIL" });
  }
}