// backend/middlewares/accessLogger.middleware.js
import { logger } from "../utils/logger.js";

export function accessLogger(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    // rotas sensíveis
    const sensitive =
      req.path.includes("/auth") ||
      req.path.includes("/payment") ||
      req.path.includes("/checkout");

    if (sensitive || res.statusCode >= 400) {
      logger.security("Access event", {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration,
        ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        ua: req.headers["user-agent"]
      });
    }
  });

  next();
}