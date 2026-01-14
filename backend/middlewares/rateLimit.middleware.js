// backend/middlewares/rateLimit.middleware.js
import rateLimit from "express-rate-limit";

/*
  Rate limit GLOBAL
  Protege o backend inteiro contra abuso básico
*/
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 requests por IP
  standardHeaders: true,
  legacyHeaders: false,
});

/*
  Rate limit para AUTH (login / register)
  Anti brute-force
*/
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 20, // 20 tentativas
  message: {
    ok: false,
    error: "TOO_MANY_ATTEMPTS",
    message: "Muitas tentativas. Aguarde alguns minutos."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/*
  Rate limit para PAGAMENTO
  Anti fraude / replay
*/
export const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10,
  message: {
    ok: false,
    error: "PAYMENT_RATE_LIMIT",
    message: "Muitas tentativas de pagamento."
  },
  standardHeaders: true,
  legacyHeaders: false,
});