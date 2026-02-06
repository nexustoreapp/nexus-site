// backend/services/monitoring.service.js

import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("logs");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_FILE = path.join(LOG_DIR, "monitor.log");

function writeLog(entry) {
  const line = JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString()
  }) + "\n";

  fs.appendFile(LOG_FILE, line, () => {});
}

export function logEvent(type, data = {}) {
  writeLog({
    level: "INFO",
    type,
    data
  });
}

export function logWarning(type, data = {}) {
  writeLog({
    level: "WARN",
    type,
    data
  });
}

export function logError(type, data = {}) {
  writeLog({
    level: "ERROR",
    type,
    data
  });
}