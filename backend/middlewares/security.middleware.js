// backend/middlewares/security.middleware.js
import { logSecurity } from "../utils/securityLogger.js";

export function securityMonitor(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (
      res.statusCode === 401 ||
      res.statusCode === 403 ||
      res.statusCode === 429
    ) {
      logSecurity("ACCESS_BLOCKED", {
        ip: req.ip,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        userAgent: req.headers["user-agent"],
        duration
      });
    }
  });

  next();
}