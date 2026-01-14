import rateLimit from "express-rate-limit";

/* ===============================
   LOGIN / AUTH (brute force)
================================ */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: "RATE_LIMIT",
    message: "Muitas tentativas. Aguarde alguns minutos."
  }
});

/* ===============================
   BUSCA / SCRAPING
================================ */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: "RATE_LIMIT",
    message: "Busca excessiva detectada."
  }
});

/* ===============================
   PAGAMENTO / FRAUDE
================================ */
export const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: "RATE_LIMIT",
    message: "Muitas tentativas de pagamento."
  }
});