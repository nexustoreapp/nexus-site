import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getSupplierBySKU } from "../supplierMap.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 ÚNICO PATH DA FILA
const QUEUE_PATH = path.join(__dirname, "../data/synceeQueue.json");

// garante que a fila existe
function ensureQueue() {
  if (!fs.existsSync(QUEUE_PATH)) {
    fs.writeFileSync(QUEUE_PATH, "[]");
  }
}

// =======================
// ROBÔ GERENTE
// =======================
export async function robotManager({ sku, qty, customer, plan }) {
  ensureQueue();

  const supplier = getSupplierBySKU(sku);

  if (!supplier) {
    return {
      ok: false,
      reason: "SKU_NOT_MAPPED"
    };
  }

  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));

  const order = {
    id: "order_" + Date.now(),
    sku,
    qty,
    plan,
    customer,
    supplier,
    status: "PENDING",
    createdAt: new Date().toISOString()
  };

  queue.push(order);

  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));

  return {
    ok: true,
    status: "QUEUED",
    orderId: order.id
  };
}
