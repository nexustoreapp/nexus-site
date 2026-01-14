// backend/utils/logger.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, "../logs");
const LOG_FILE = path.join(LOG_DIR, "security.log");

// cria pasta se não existir
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

function writeLog(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    meta
  };// backend/utils/logger.js
import fs from "fs";
import path from "path";
import crypto from "crypto";

const LOG_DIR = path.resolve("logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

export function log(level, message, context = {}) {
  ensureDir();

  const entry = {
    level,
    message,
    service: "nexus-backend",
    timestamp: new Date().toISOString(),
    requestId: context.requestId || crypto.randomUUID(),
    context
  };

  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");

  if (level === "error" || level === "critical") {
    console.error(entry);
  } else {
    console.log(entry);
  }
}

  const line = JSON.stringify(entry) + "\n";

  fs.appendFileSync(LOG_FILE, line);

  // Render captura console
  console.log(`[${level}]`, message, meta);
}

export const logger = {
  info: (msg, meta) => writeLog("INFO", msg, meta),
  warn: (msg, meta) => writeLog("WARN", msg, meta),
  error: (msg, meta) => writeLog("ERROR", msg, meta),
  security: (msg, meta) => writeLog("SECURITY", msg, meta)
};