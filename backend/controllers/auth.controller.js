// backend/controllers/auth.controller.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { isValidCPF, onlyDigits } from "../utils/cpf.js";
import { findUserByEmail, findUserByCPF, upsertUser } from "../utils/userStore.js";

const JWT_SECRET = process.env.JWT_SECRET;

// ===============================
// REGISTER
// ===============================
export async function register(req, res) {
  try {
    const { email, password, cpf } = req.body || {};

    if (!email || !password || !cpf) {
      return res.status(400).json({ ok:false, error:"INVALID_DATA" });
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

    const now = Date.now();
    const hash = await bcrypt.hash(password, 10);

    const user = {
      id: String(now),
      email,
      cpf: cpfClean,
      password: hash,
      plan: "free", // 🔒 PLANO OFICIAL INICIAL
      verified: true,
      createdAt: now,
      updatedAt: now
    };

    upsertUser(user);

    return res.json({ ok:true });

  } catch (err) {
    console.error("[REGISTER]", err);
    return res.status(500).json({ ok:false, error:"SERVER_ERROR" });
  }
}

// ===============================
// LOGIN
// ===============================
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

    // 🔐 JWT OFICIAL
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        cpf: user.cpf,
        plan: user.plan
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ ok:true, token });

  } catch (err) {
    console.error("[LOGIN]", err);
    return res.status(500).json({ ok:false, error:"SERVER_ERROR" });
  }
}