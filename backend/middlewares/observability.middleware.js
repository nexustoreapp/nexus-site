// backend/middlewares/observability.middleware.js
import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("logs");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

export function observability(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    const log = {
      time: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"] || "unknown"
    };

    fs.appendFile(
      path.join(LOG_DIR, "access.log"),
      JSON.stringify(log) + "\n",
      () => {}
    );
  });

  next();
}