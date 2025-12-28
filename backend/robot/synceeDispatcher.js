import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 MESMO PATH DO CONTROLLER
const QUEUE_PATH = path.join(__dirname, "../data/synceeQueue.json");

export async function runSynceeDispatcher() {
  if (!fs.existsSync(QUEUE_PATH)) return;

  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
  let changed = false;

  for (const order of queue) {
    if (order.status !== "PENDING") continue;

    order.status = "SENT_TO_SUPPLIER";
    order.sentAt = new Date().toISOString();
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
  }
}
