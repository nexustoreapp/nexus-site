// backend/controllers/auth.controller.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { validateRecaptchaToken } from "../utils/recaptcha.js";
import { findUserByEmail, createUser } from "../services/users.service.js";

const JWT_SECRET = process.env.JWT_SECRET;

export async function registerController(req, res) {
  try {
    const { email, password, recaptchaToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: "EMAIL_AND_PASSWORD_REQUIRED"
      });
    }

    // ✅ CAPTCHA obrigatório (como você quer)
    const captchaOk = await validateRecaptchaToken(recaptchaToken);
    if (!captchaOk) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_RECAPTCHA"
      });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: "EMAIL_ALREADY_EXISTS"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      email,
      passwordHash
    });

    return res.json({
      ok: true,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "REGISTER_ERROR"
    });
  }
}

export async function loginController(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: "EMAIL_AND_PASSWORD_REQUIRED"
      });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        ok: false,
        error: "INVALID_CREDENTIALS"
      });
    }

    const ok = await bcrypt.compare(password, user.password_hash || user.passwordHash);
    if (!ok) {
      return res.status(401).json({
        ok: false,
        error: "INVALID_CREDENTIALS"
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "LOGIN_ERROR"
    });
  }
}

// ✅ novo: confirma “tô logado?”
export async function meController(req, res) {
  return res.json({
    ok: true,
    user: req.user
  });
}