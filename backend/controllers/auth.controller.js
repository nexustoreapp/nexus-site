import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { isValidCPF, onlyDigits } from "../utils/cpf.js";
import { findUserByEmail, findUserByCPF, upsertUser } from "../utils/userStore.js";

// REGISTER (SEM OTP)
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
    if (user) {
      return res.status(409).json({ ok: false, error: "USER_EXISTS" });
    }

    const now = Date.now();
    const hash = await bcrypt.hash(password, 10);

    user = {
      id: String(now),
      email,
      cpf: cpfClean,
      password: hash,
      verified: true, // 🔥 já verificado
      plan: "free",
      createdAt: now,
      updatedAt: now
    };

    upsertUser(user);

    return res.json({ ok: true });
  } catch (err) {
    console.error("[AUTH REGISTER ERROR]", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// LOGIN (SEM OTP)
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "INVALID_DATA" });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        cpf: user.cpf,
        plan: user.plan
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ ok: true, token });
  } catch (err) {
    console.error("[AUTH LOGIN ERROR]", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// VERIFY OTP (DESATIVADO)
export function verifyOtp(req, res) {
  return res.status(410).json({
    ok: false,
    error: "OTP_DISABLED"
  });
}