// backend/controllers/auth.controller.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "../db/db.js";
import { verifyRecaptcha } from "../utils/recaptcha.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function getBearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  const [type, token] = String(h).split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

/**
 * POST /v1/auth/register
 * body: { name?, email, password, recaptchaToken }
 */
export async function register(req, res) {
  try {
    const { name, email, password, recaptchaToken } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email e password são obrigatórios" });
    }

    // Mantém o CAPTCHA (não vamos remover)
    const captchaOk = await verifyRecaptcha(recaptchaToken, req.ip);
    if (!captchaOk) {
      return res.status(400).json({ ok: false, error: "captcha inválido" });
    }

    const emailNorm = String(email).trim().toLowerCase();

    // já existe?
    const exists = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [emailNorm]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ ok: false, error: "usuário já existe" });
    }

    const hash = await bcrypt.hash(String(password), 10);

    const insert = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name ? String(name).trim() : null, emailNorm, hash]
    );

    const user = insert.rows[0];
    const token = signToken({ sub: user.id, email: user.email });

    return res.status(201).json({
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ ok: false, error: "erro interno no registro" });
  }
}

/**
 * POST /v1/auth/login
 * body: { email, password }
 * (login SEM captcha, conforme teu fluxo do front)
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "email e password são obrigatórios" });
    }

    const emailNorm = String(email).trim().toLowerCase();

    const q = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = $1 LIMIT 1",
      [emailNorm]
    );

    if (q.rows.length === 0) {
      return res.status(401).json({ ok: false, error: "credenciais inválidas" });
    }

    const user = q.rows[0];
    const okPass = await bcrypt.compare(String(password), user.password_hash);
    if (!okPass) {
      return res.status(401).json({ ok: false, error: "credenciais inválidas" });
    }

    const token = signToken({ sub: user.id, email: user.email });

    return res.json({
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ ok: false, error: "erro interno no login" });
  }
}

/**
 * GET /v1/auth/me
 * header: Authorization: Bearer <token>
 */
export async function me(req, res) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ ok: false, error: "token ausente" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded?.sub;

    if (!userId) return res.status(401).json({ ok: false, error: "token inválido" });

    const q = await pool.query("SELECT id, name, email, created_at FROM users WHERE id = $1", [
      userId,
    ]);

    if (q.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "usuário não encontrado" });
    }

    return res.json({ ok: true, user: q.rows[0] });
  } catch (err) {
    console.error("me error:", err);
    return res.status(401).json({ ok: false, error: "token inválido/expirado" });
  }
}

/**
 * Aliases (pra compatibilidade com rotas diferentes)
 * - alguns arquivos importam register/login
 * - outros importam registerController/loginController/meController
 */
export const registerController = register;
export const loginController = login;
export const meController = me;