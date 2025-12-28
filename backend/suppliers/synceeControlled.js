// backend/suppliers/synceeControlled.js

import fs from "fs";
import path from "path";

// =======================
// FILA LOCAL DE PEDIDOS
// =======================
const QUEUE_PATH = path.resolve("backend/data/synceeQueue.json");

// =======================
// GARANTIR FILA
// =======================
function ensureQueue() {
  if (!fs.existsSync(QUEUE_PATH)) {
    fs.writeFileSync(QUEUE_PATH, JSON.stringify([], null, 2));
  }
}

// =======================
// ENVIAR PEDIDO PARA FILA
// =======================
export async function pushOrderToSynceeQueue(order) {
  try {
    ensureQueue();

    const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));

    const payload = {
      id: generateQueueId(),
      supplier: "syncee",
      supplierProductId: order.supplierProductId,
      sku: order.sku,
      qty: order.qty,
      priceLimit: order.priceLimit,
      customer: order.customer,
      status: "PENDING",
      createdAt: new Date().toISOString()
    };

    queue.push(payload);

    fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));

    return true;
  } catch (err) {
    console.error("[SYNCEE QUEUE ERROR]", err.message);
    return false;
  }
}

// =======================
// GERAR ID DA FILA
// =======================
function generateQueueId() {
  return "sq-" + Math.random().toString(36).substring(2, 10);
}
