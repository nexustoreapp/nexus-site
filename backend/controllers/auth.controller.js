import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";

const users = new Map();
const otps = new Map();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.SMTP_FROM || "Nexus <noreply@nexustore.store>";

async function sendOtp(email, otp) {
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

// ==============================
// REGISTER (rápido)
// ==============================
export async function register(req, res) {
  try {
    const { email, password, cpf } = req.body || {};
    if (!email || !password || !cpf) {
      return res.status(400).json({ ok: false, error: "INVALID_DATA" });
    }

    let user = users.get(email);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps.set(email, otp);

    if (!user) {
      const hash = await bcrypt.hash(password, 10);
      user = { email, password: hash, verified: false, cpf };
      users.set(email, user);
    }

    res.json({ ok: true, message: "OTP_SENT" });

    await sendOtp(email, otp);

  } catch (err) {
    console.error("[AUTH REGISTER ERROR]", err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// ==============================
// VERIFY OTP
// ==============================
export function verifyOtp(req, res) {
  const { email, otp } = req.body || {};
  const saved = otps.get(email);
  const user = users.get(email);

  if (!user || saved !== otp) {
    return res.status(400).json({ ok: false, error: "OTP_INVALID" });
  }

  user.verified = true;
  otps.delete(email);

  res.json({ ok: true });
}

// ==============================
// LOGIN
// ==============================
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    const user = users.get(email);

    if (!user) return res.status(401).json({ ok: false });
    if (!user.verified) return res.status(401).json({ ok: false, error: "NOT_VERIFIED" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ ok: false });

    const token = jwt.sign(
      { email: user.email, cpf: user.cpf },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ ok: true, token });

  } catch (err) {
    console.error("[AUTH LOGIN ERROR]", err);
    res.status(500).json({ ok: false });
  }
}