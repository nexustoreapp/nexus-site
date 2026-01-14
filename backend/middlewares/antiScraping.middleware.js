// backend/middlewares/antiScraping.middleware.js

const memory = new Map();

/*
  Proteção simples e eficaz:
  - Detecta muitas requisições em pouco tempo
  - Bloqueia User-Agents suspeitos
  - Evita scraping agressivo
*/

export function antiScraping(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";

  const ua = (req.headers["user-agent"] || "").toLowerCase();

  // User-Agents suspeitos comuns
  const blockedAgents = [
    "python",
    "curl",
    "wget",
    "scrapy",
    "httpclient",
    "axios",
    "postmanruntime",
    "go-http-client"
  ];

  if (blockedAgents.some(a => ua.includes(a))) {
    return res.status(403).json({
      ok: false,
      error: "BOT_BLOCKED"
    });
  }

  const now = Date.now();
  const windowMs = 10_000; // 10s
  const limit = 60;       // 60 req / 10s por IP

  const record = memory.get(ip) || { count: 0, start: now };

  if (now - record.start > windowMs) {
    record.count = 1;
    record.start = now;
  } else {
    record.count++;
  }

  memory.set(ip, record);

  if (record.count > limit) {
    return res.status(429).json({
      ok: false,
      error: "TOO_MANY_REQUESTS"
    });
  }

  next();
}