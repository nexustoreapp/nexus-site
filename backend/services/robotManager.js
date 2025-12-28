import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getSupplierBySKU } from "../supplierMap.js";
import { evaluateOrder } from "../robot/robotRules.js";
import { calculatePrice } from "../robot/priceEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_PATH = path.join(__dirname, "../data/synceeQueue.json");

function ensureQueue() {
  if (!fs.existsSync(QUEUE_PATH)) {
    fs.writeFileSync(QUEUE_PATH, "[]");
  }
}

export async function robotManager({ sku, qty, customer, plan }) {
  ensureQueue();

  const supplier = getSupplierBySKU(sku);
  if (!supplier) {
    return { ok: false, reason: "SKU_NOT_MAPPED" };
  }

  // Preço base (do fornecedor)
  const basePriceBRL = supplier.maxPrice;

  const order = {
    id: "order_" + Date.now(),
    sku,
    qty,
    plan,
    customer,
    supplier,
    basePriceBRL,
    finalPriceBRL: calculatePrice({ basePriceBRL, plan }),
    status: "EVALUATING",
    createdAt: new Date().toISOString()
  };

  // 🧠 Regras inteligentes (PASSO B)
  const decision = evaluateOrder({ order, supplier });

  if (!decision.allowed) {
    order.status = "BLOCKED";
    order.blockReason = decision.reason;
    save(order);
    return { ok: true, status: "BLOCKED", reason: decision.reason };
  }

  order.status = "PENDING";
  save(order);

  return {
    ok: true,
    status: "QUEUED",
    orderId: order.id,
    price: order.finalPriceBRL
  };
}

function save(order) {
  const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
  queue.push(order);
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
}
