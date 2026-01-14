// backend/utils/securityLogger.js
import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("backend/logs");
const LOG_FILE = path.join(LOG_DIR, "security.log");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function logSecurity(event, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...data
  };

  fs.appendFile(
    LOG_FILE,
    JSON.stringify(entry) + "\n",
    (err) => {
      if (err) console.error("[SECURITY LOG ERROR]", err);
    }
  );
}