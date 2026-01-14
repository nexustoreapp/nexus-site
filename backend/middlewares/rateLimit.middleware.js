// backend/middlewares/rateLimit.middleware.js
import rateLimit from "express-rate-limit";

/*
  Rate limit GLOBAL
  - Protege login, pagamento, busca, scraping básico
*/
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 req por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    error: "RATE_LIMIT_EXCEEDED",
    message: "Muitas requisições. Tente novamente mais tarde."
  }
});

/*
  Rate limit ESPECÍFICO (login)
*/
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    ok: false,
    error: "AUTH_RATE_LIMIT",
    message: "Muitas tentativas de login."
  }
});