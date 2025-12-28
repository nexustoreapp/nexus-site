// backend/robot/synceeDispatcher.js

import fs from "fs";
import path from "path";

// =======================
// PATH DA FILA
// =======================
const QUEUE_PATH = path.resolve("backend/data/synceeQueue.json");

// =======================
// DISPATCHER PRINCIPAL
// =======================
export async function runSynceeDispatcher() {
  if (!fs.existsSync(QUEUE_PATH)) return;

  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
  let changed = false;

  for (const order of queue) {
    if (order.status !== "PENDING") continue;

    try {
      // 🔴 AQUI É ONDE O PEDIDO REAL SERIA FEITO
      // (browser automation / painel syncee / webhook futuro)

      console.log("[SYNCEE DISPATCH]", order.sku);

      // SIMULA SUCESSO CONTROLADO
      order.status = "SENT_TO_SUPPLIER";
      order.sentAt = new Date().toISOString();
      order.supplierOrderId = "syncee-" + Math.random().toString(36).slice(2, 10);

      changed = true;

    } catch (err) {
      console.error("[DISPATCH ERROR]", err.message);

      order.status = "FAILED";
      order.error = err.message;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
  }
}
