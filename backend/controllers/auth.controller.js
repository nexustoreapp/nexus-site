import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const users = new Map(); // memória (depois vira DB)
const otps = new Map();

// ==============================
// EMAIL (SMTP)
// ==============================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ==============================
// REGISTER
// ==============================
export async function register(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Dados inválidos" });
    }

    if (users.has(email)) {
      return res.status(400).json({ ok: false, error: "Usuário já existe" });
    }

    const hash = await bcrypt.hash(password, 10);

    users.set(email, {
      email,
      password: hash,
      verified: false
    });

    // gera OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps.set(email, otp);

    await transporter.sendMail({
      from: `"Nexus" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Seu código de verificação",
      text: `Seu código OTP é: ${otp}`
    });

    return res.json({ ok: true, message: "OTP enviado para o email" });

  } catch (err) {
    console.error("REGISTER ERROR", err);
    return res.status(500).json({ ok: false, error: "Erro interno" });
  }
}

// ==============================
// VERIFY OTP
// ==============================
export function verifyOtp(req, res) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ ok: false, error: "Dados inválidos" });
  }

  const savedOtp = otps.get(email);
  if (savedOtp !== otp) {
    return res.status(400).json({ ok: false, error: "OTP inválido" });
  }

  const user = users.get(email);
  if (!user) {
    return res.status(400).json({ ok: false, error: "Usuário não encontrado" });
  }

  user.verified = true;
  otps.delete(email);

  return res.json({ ok: true, message: "Conta verificada com sucesso" });
}

// ==============================
// LOGIN
// ==============================
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ ok: false, error: "Credenciais inválidas" });
    }

    if (!user.verified) {
      return res.status(401).json({ ok: false, error: "Conta não verificada" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ ok: false, error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ ok: true, token });

  } catch (err) {
    console.error("LOGIN ERROR", err);
    return res.status(500).json({ ok: false, error: "Erro interno" });
  }
}