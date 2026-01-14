// backend/middlewares/error.middleware.js

export function errorHandler(err, req, res, next) {
  console.error("[ERROR]", {
    path: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: err.stack
  });

  res.status(500).json({
    ok: false,
    error: "INTERNAL_SERVER_ERROR"
  });
}