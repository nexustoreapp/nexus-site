// backend/robot/robotManager.js

import { getSupplierBySKU } from "../supplierMap.js";
import { pushOrderToSynceeQueue } from "../suppliers/synceeControlled.js";

// =======================
// CONFIGURAÇÕES DO ROBÔ
// =======================
const MAX_PRICE = 2000;
const ALLOWED_COUNTRIES = ["BR"];
const ALLOWED_CATEGORIES = [
  "CPU",
  "GPU",
  "Memória RAM",
  "SSD",
  "Placa-mãe",
  "Fonte (PSU)",
  "Gabinete",
  "Cooler / Water Cooler",
  "Acessórios Mobile",
  "Roteador",
  "Controle (Gamepad)"
];

// =======================
// ROBÔ GERENTE (SEM API)
// =======================
export async function robotManager(order) {
  const { sku, qty, customer } = order;

  if (!sku || !qty || !customer?.country) {
    return fail("INVALID_ORDER_DATA");
  }

  if (!ALLOWED_COUNTRIES.includes(customer.country)) {
    return fail("COUNTRY_NOT_ALLOWED");
  }

  // 🔹 Mapa de SKU
  const map = getSupplierBySKU(sku);
  if (!map) {
    return fail("SKU_NOT_MAPPED");
  }

  if (!ALLOWED_CATEGORIES.includes(map.category)) {
    return fail("CATEGORY_BLOCKED");
  }

  // 🔹 Regra de preço
  if (map.maxPrice > MAX_PRICE) {
    return fail("PRICE_ABOVE_LIMIT");
  }

  // 🔹 Envio controlado para Syncee
  const orderPayload = {
    supplier: "syncee",
    supplierProductId: map.supplierProductId,
    sku,
    qty,
    priceLimit: MAX_PRICE,
    customer
  };

  const queued = await pushOrderToSynceeQueue(orderPayload);

  if (!queued) {
    return {
      ok: true,
      status: "EXCEPTION",
      reason: "QUEUE_FAILED"
    };
  }

  return {
    ok: true,
    status: "QUEUED",
    supplier: "syncee",
    orderId: generateOrderId()
  };
}


// =======================
// HELPERS
// =======================
function fail(reason) {
  return { ok: false, reason };
}

function generateOrderId() {
  return "ord-" + Math.random().toString(36).substring(2, 10);
}
