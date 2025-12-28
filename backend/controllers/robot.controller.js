// backend/controllers/robot.controller.js

import { robotManager } from "../services/robotManager.js";

export async function submitRobotOrder(req, res) {
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
