// backend/middlewares/error.middleware.js
import { logError } from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
  const message = err?.message || "UNKNOWN_ERROR";
  const stack = err?.stack || "no-stack";

  logError(`${message} | ${stack}`);

  res.status(500).json({
    ok: false,
    error: "INTERNAL_SERVER_ERROR"
  });
}