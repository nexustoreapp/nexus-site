// backend/controllers/robot.controller.js

import fs from "fs";
import path from "path";
import { robotManager } from "../services/robotManager.js";
import { getSupplierBySKU } from "../supplierMap.js";

// 🔴 ÚNICO ARQUIVO DE FILA
const QUEUE_PATH = path.resolve("backend/data/synceeQueue.json");

// =======================
// SUBMIT PEDIDO
// =======================
export async function robotSubmitOrder(req, res) {
  try {
    const { sku, qty, customer, plan } = req.body;

    if (!sku || !qty || !customer) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_PAYLOAD"
      });
    }

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
      reason: err?.message || "UNKNOWN_ERROR"
    });
  }
}

// =======================
// LISTAR PEDIDOS (FILA)
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
    return res.status(500).json({
      ok: false,
      error: "QUEUE_READ_FAILED"
    });
  }
}

// =======================
// VER MAPA SKU
// =======================
export function robotGetMap(req, res) {
  const sku = req.query.sku;
  return res.json({
    ok: true,
    map: getSupplierBySKU(sku)
  });
}

// =======================
// VER REGRAS
// =======================
export function robotGetRules(req, res) {
  return res.json({
    mode: "CONTROLLED_NO_API",
    maxPrice: 2000,
    allowedSuppliers: ["syncee"]
  });
}
