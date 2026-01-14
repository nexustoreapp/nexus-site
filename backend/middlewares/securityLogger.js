import fs from "fs";
import path from "path";

const logDir = path.resolve("backend/logs");
const logFile = path.join(logDir, "security.log");

// garante que a pasta existe
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export function logSecurity(event, req, extra = {}) {
  const entry = {
    time: new Date().toISOString(),
    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
    method: req.method,
    path: req.originalUrl,
    userAgent: req.headers["user-agent"],
    event,
    ...extra
  };

  fs.appendFile(
    logFile,
    JSON.stringify(entry) + "\n",
    () => {}
  );
}