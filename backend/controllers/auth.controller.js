import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const users = new Map();
const otps = new Map();

// SMTP (mantém, mas não depende)
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
      return res.status(400).json({ ok: false, error: "INVALID_DATA" });
    }

    if (users.has(email)) {
      return res.status(400).json({ ok: false, error: "USER_EXISTS" });
    }

    const hash = await bcrypt.hash(password, 10);
    users.set(email, {
      email,
      password: hash,
      verified: false
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps.set(email, otp);

    // tenta enviar email
    try {
      await transporter.sendMail({
        from: `"Nexus" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Código de verificação",
        text: `Seu código OTP é: ${otp}`
      });

      return res.json({ ok: true, message: "OTP_SENT" });

    } catch (mailErr) {
      console.error("SMTP FALHOU, MODO DEV:", mailErr.message);

      // 🔥 MODO DEV: devolve OTP
      return res.json({
        ok: true,
        message: "OTP_SENT_DEV",
        otp
      });
    }

  } catch (err) {
    console.error("REGISTER ERROR", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

// ==============================
// VERIFY OTP
// ==============================
export function verifyOtp(req, res) {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ ok: false, error: "INVALID_DATA" });
  }

  const savedOtp = otps.get(email);
  if (savedOtp !== otp) {
    return res.status(400).json({ ok: false, error: "OTP_INVALID" });
  }

  const user = users.get(email);
  if (!user) {
    return res.status(400).json({ ok: false, error: "USER_NOT_FOUND" });
  }

  user.verified = true;
  otps.delete(email);

  return res.json({ ok: true });
}

// ==============================
// LOGIN
// ==============================
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = users.get(email);
    if (!user) {
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    if (!user.verified) {
      return res.status(401).json({ ok: false, error: "NOT_VERIFIED" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
    }

    const token = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ ok: true, token });

  } catch (err) {
    console.error("LOGIN ERROR", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}