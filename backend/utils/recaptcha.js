// backend/utils/recaptcha.js
/**
 * Google reCAPTCHA v2/v3 verification helper
 *
 * Env:
 * - RECAPTCHA_SECRET_KEY (ou RECAPTCHA_SECRET)
 *
 * Usage:
 *   const ok = await verifyRecaptcha(token, ip);
 */

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

function getSecret() {
  return (
    process.env.RECAPTCHA_SECRET_KEY ||
    process.env.RECAPTCHA_SECRET ||
    ""
  );
}

export async function verifyRecaptcha(token, remoteIp) {
  try {
    const secret = getSecret();

    // Se não tiver secret configurado, falha fechado (proteção)
    if (!secret) {
      console.warn("⚠️ RECAPTCHA_SECRET_KEY não configurado");
      return false;
    }

    // Token vazio = inválido
    if (!token || typeof token !== "string") return false;

    const params = new URLSearchParams();
    params.set("secret", secret);
    params.set("response", token);
    if (remoteIp) params.set("remoteip", String(remoteIp));

    const resp = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!resp.ok) return false;

    const data = await resp.json();

    // v2/v3: "success" boolean
    if (data && data.success === true) return true;

    return false;
  } catch (err) {
    console.error("verifyRecaptcha error:", err);
    return false;
  }
}

// Compat: se algum lugar importar default
export default verifyRecaptcha;