// backend/middlewares/rateLimit.middleware.js

const requests = new Map();

/**
 * Rate limit geral
 * ~100 req/min por IP
 */
export function rateLimiter(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "unknown";

  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 100;

  if (!requests.has(ip)) {
    requests.set(ip, []);
  }

  const timestamps = requests.get(ip).filter(
    (t) => now - t < windowMs
  );

  timestamps.push(now);
  requests.set(ip, timestamps);

  if (timestamps.length > limit) {
    return res.status(429).json({
      ok: false,
      error: "RATE_LIMIT_EXCEEDED"
    });
  }

  next();
}

/**
 * Rate limit para autenticação
 * ~10 tentativas / 5 minutos
 */
export function authLimiter(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "unknown";

  const key = `auth:${ip}`;
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const limit = 10;

  if (!requests.has(key)) {
    requests.set(key, []);
  }

  const attempts = requests.get(key).filter(
    (t) => now - t < windowMs
  );

  attempts.push(now);
  requests.set(key, attempts);

  if (attempts.length > limit) {
    return res.status(429).json({
      ok: false,
      error: "TOO_MANY_AUTH_ATTEMPTS"
    });
  }

  next();
}

/**
 * Rate limit para pagamentos / checkout
 * ~5 tentativas / 10 minutos
 */
export function paymentLimiter(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "unknown";

  const key = `payment:${ip}`;
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const limit = 5;

  if (!requests.has(key)) {
    requests.set(key, []);
  }

  const attempts = requests.get(key).filter(
    (t) => now - t < windowMs
  );

  attempts.push(now);
  requests.set(key, attempts);

  if (attempts.length > limit) {
    return res.status(429).json({
      ok: false,
      error: "PAYMENT_RATE_LIMIT_EXCEEDED"
    });
  }

  next();
}