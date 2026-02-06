// backend/utils/anomalyDetector.js
export function isSuspicious(log) {
  if (log.duration < 5 && log.method === "POST") return true;
  if (log.status === 401 || log.status === 403) return true;
  return false;
}