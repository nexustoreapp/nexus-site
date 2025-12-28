// backend/controllers/robot.controller.js

import { robotManager } from "../services/robotManager.js";
import { getSupplierBySKU } from "../supplierMap.js";
import fs from "fs";
import path from "path";

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
// LISTAR PEDIDOS DA FILA
// =======================
export function robotListOrders(req, res) {
  try {
    const queuePath = path.resolve("backend/data/synceeQueue.json");

    if (!fs.existsSync(queuePath)) {
      return res.json([]);
    }

    const data = JSON.parse(fs.readFileSync(queuePath, "utf8"));
    return res.json(data);

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "QUEUE_READ_FAILED"
    });
  }
}

// =======================
// VER MAPA DE SKU
// =======================
export function robotGetMap(req, res) {
  try {
    return res.json({
      ok: true,
      map: getSupplierBySKU(req.query.sku || "")
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "MAP_READ_FAILED"
    });
  }
}

// =======================
// VER REGRAS DO ROBÔ
// =======================
export function robotGetRules(req, res) {
  return res.json({
    maxPrice: 2000,
    allowedCountries: ["BR"],
    allowedSuppliers: ["syncee"],
    mode: "CONTROLLED_NO_API"
  });
}
