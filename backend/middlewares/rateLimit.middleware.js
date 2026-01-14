import rateLimit from "express-rate-limit";

/**
 * Limite geral da API
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 requests por IP
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Login / Auth (anti brute force)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 tentativas
  message: {
    ok: false,
    error: "TOO_MANY_ATTEMPTS",
    message: "Muitas tentativas. Tente novamente mais tarde."
  }
});

/**
 * Pagamentos (anti fraude)
 */
export const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    ok: false,
    error: "PAYMENT_RATE_LIMIT",
    message: "Muitas tentativas de pagamento."
  }
});