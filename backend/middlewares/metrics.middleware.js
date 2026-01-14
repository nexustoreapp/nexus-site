// backend/middlewares/metrics.middleware.js
import { log } from "../utils/logger.js";

export function metrics(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    log("info", "Request finished", {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration
    });
  });

  next();
}