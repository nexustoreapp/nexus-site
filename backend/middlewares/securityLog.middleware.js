// backend/middlewares/securityLog.middleware.js
import { logSecurity, logAccess } from "../utils/logger.js";

export function securityLogger(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "unknown";

  const ua = req.headers["user-agent"] || "unknown";
  const path = req.originalUrl;
  const method = req.method;

  logAccess(`${ip} ${method} ${path} UA=${ua}`);

  // Heurísticas básicas de ataque
  if (
    path.includes("..") ||
    path.includes("<script") ||
    path.includes("select ") ||
    path.includes("union ")
  ) {
    logSecurity(
      `SUSPECT_REQUEST ip=${ip} path=${path} ua=${ua}`
    );
  }

  next();
}