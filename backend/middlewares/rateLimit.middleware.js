// backend/middlewares/rateLimit.middleware.js
const requests = new Map();

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