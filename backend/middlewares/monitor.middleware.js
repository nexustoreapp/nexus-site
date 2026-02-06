// backend/middlewares/monitor.middleware.js

import { logEvent } from "../services/monitoring.service.js";

export function monitorRequest(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (res.statusCode >= 400) {
      logEvent("HTTP_ERROR", {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration
      });
    }
  });

  next();
}