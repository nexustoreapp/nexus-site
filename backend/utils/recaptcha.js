// backend/utils/recaptcha.js
import fetch from "node-fetch";

/**
 * Verifica reCAPTCHA v2/v3 (token vindo do front).
 * Espera env: RECAPTCHA_SECRET
 */
export async function verifyRecaptchaToken(token) {
  const secret = process.env.RECAPTCHA_SECRET;

  // Se não tiver secret configurado, melhor falhar fechado (proteção)
  if (!secret) return false;
  if (!token || typeof token !== "string") return false;

  try {
    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("response", token);

    const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });

    const data = await r.json();

    // v2: data.success true/false
    // v3: data.success true/false (score vem também, mas aqui é “mínimo”)
    return data?.success === true;
  } catch (e) {
    return false;
  }
}