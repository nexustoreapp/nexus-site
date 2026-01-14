// backend/utils/alertLogger.js
import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("logs");
const ALERT_FILE = path.join(LOG_DIR, "critical-alerts.log");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

export function logCriticalAlert(message, context = {}) {
  try {
    ensureLogDir();

    const entry = {
      level: "CRITICAL",
      message,
      context,
      timestamp: new Date().toISOString()
    };

    fs.appendFileSync(
      ALERT_FILE,
      JSON.stringify(entry) + "\n",
      "utf8"
    );

    // 🔥 ALERTA VISÍVEL NO RENDER
    console.error("🚨 CRITICAL ALERT:", entry);

  } catch (err) {
    console.error("❌ Falha ao registrar alerta crítico", err);
  }
}