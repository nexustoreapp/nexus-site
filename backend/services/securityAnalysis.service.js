// backend/services/securityAnalysis.service.js
import fs from "fs";
import path from "path";

const LOG_FILE = path.resolve("logs/access.log");

export function analyzeLogs() {
  if (!fs.existsSync(LOG_FILE)) return;

  const lines = fs.readFileSync(LOG_FILE, "utf-8").trim().split("\n");

  let suspicious = 0;

  for (const line of lines) {
    try {
      const log = JSON.parse(line);
      if (log.status === 401 || log.status === 403) suspicious++;
    } catch {}
  }

  return {
    total: lines.length,
    suspicious
  };
}