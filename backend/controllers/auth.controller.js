import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const users = new Map();
const otps = new Map();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  pool: true,
  maxConnections: 1,
  maxMessages: 5
});

// 🔥 ENVIO ASSÍNCRONO COM RETRY (NÃO BLOQUEIA)
async function sendOtpEmail(email, otp) {
  for (let i = 0; i < 3; i++) {
    try {
      await transporter.sendMail({
        from: `"Nexus" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Código de verificação Nexus",
        text: `Seu código de verificação é: ${otp}`
      });
      return true;
    } catch (err) {
      console.error("SMTP tentativa falhou:", err.message);
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return false;
}

// ==============================
// REGISTER (RÁPIDO)
// ==============================
export async function register(req, res) {
  const { email, password, cpf } = req.body;
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: "INVALID_DATA" });
  }

  let user = users.get(email);

  // gera OTP sempre
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps.set(email, otp);

  // cria usuário se não existir
  if (!user) {
    const hash = await bcrypt.hash(password, 10);
    user = { email, password: hash, verified: false };
    users.set(email, user);
  }

  // 🔥 RESPONDE IMEDIATO (≤ 1s)
  res.json({
    ok: true,
    message: user.verified ? "USER_ALREADY_VERIFIED" : "OTP_SENT"
  });

  // 🔥 ENVIO EM BACKGROUND (NÃO BLOQUEIA)
  const sent = await sendOtpEmail(email, otp);
  if (!sent) {
    console.warn("SMTP falhou, OTP disponível apenas em DEV:", otp);
  }
}

// ==============================
// VERIFY OTP
// ==============================
export function verifyOtp(req, res) {
  const { email, otp } = req.body;
  const saved = otps.get(email);
  const user = users.get(email);

  if (!user || saved !== otp) {
    return res.status(400).json({ ok: false, error: "OTP_INVALID" });
  }

  user.verified = true;
  otps.delete(email);

  return res.json({ ok: true });
}

// ==============================
// LOGIN
// ==============================
export async function login(req, res) {
  const { email, password } = req.body;
  const user = users.get(email);

  if (!user) return res.status(401).json({ ok: false });
  if (!user.verified) return res.status(401).json({ ok: false, error: "NOT_VERIFIED" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ ok: false });

  const token = jwt.sign(
    { email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res.json({ ok: true, token });
}