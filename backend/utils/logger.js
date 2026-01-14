// backend/utils/logger.js
import fs from "fs";
import path from "path";

const logsDir = path.resolve("backend/logs");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function writeLog(file, message) {
  const filePath = path.join(logsDir, file);
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFile(filePath, line, () => {});
}

export const logSecurity = (msg) => writeLog("security.log", msg);
export const logAccess = (msg) => writeLog("access.log", msg);
export const logError = (msg) => writeLog("error.log", msg);