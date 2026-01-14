/**
 * Anti-scraping simples:
 * - bloqueia User-Agents suspeitos
 * - exige header básico em rotas sensíveis
 * - corta bursts óbvios (sem estado)
 */

const BLOCKED_UA = [
  "python",
  "scrapy",
  "curl",
  "wget",
  "httpclient",
  "axios",
  "aiohttp",
  "go-http-client",
  "java",
  "libwww",
  "phantomjs",
  "headless",
  "playwright",
  "puppeteer"
];

export function antiScraping(req, res, next) {
  const ua = (req.headers["user-agent"] || "").toLowerCase();

  if (!ua || BLOCKED_UA.some(b => ua.includes(b))) {
    return res.status(403).json({
      ok: false,
      error: "SCRAPING_BLOCKED"
    });
  }

  // Header mínimo esperado (frontend envia automaticamente)
  if (!req.headers["x-nexus-client"]) {
    return res.status(403).json({
      ok: false,
      error: "CLIENT_HEADER_REQUIRED"
    });
  }

  next();
}