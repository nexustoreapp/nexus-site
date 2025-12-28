import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { robotManager } from "../services/robotManager.js";
import { getSupplierBySKU } from "../supplierMap.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 PATH ABSOLUTO CORRETO (RENDER SAFE)
const QUEUE_PATH = path.join(__dirname, "../data/synceeQueue.json");

// =======================
// SUBMIT
// =======================
export async function robotSubmitOrder(req, res) {
  try {
    const { sku, qty, customer, plan } = req.body;

    const result = await robotManager({
      sku,
      qty,
      customer,
      plan
    });

    return res.json(result);

  } catch (err) {
    console.error("[ROBOT SUBMIT ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: "ROBOT_SUBMIT_FAILED",
      reason: err.message
    });
  }
}

// =======================
// LISTAR FILA
// =======================
export function robotListOrders(req, res) {
  try {
    if (!fs.existsSync(QUEUE_PATH)) {
      return res.json([]);
    }

    const data = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
    return res.json(data);

  } catch (err) {
    console.error("[ROBOT LIST ERROR]", err);
    return res.status(500).json({ ok: false });
  }
}

// =======================
// MAPA SKU
// =======================
export function robotGetMap(req, res) {
  return res.json({
    ok: true,
    map: getSupplierBySKU(req.query.sku)
  });
}

// =======================
// REGRAS
// =======================
export function robotGetRules(req, res) {
  return res.json({
    mode: "CONTROLLED",
    maxPrice: 2000
  });
}
