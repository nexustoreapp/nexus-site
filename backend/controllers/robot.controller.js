import { robotManager } from "../services/robotManager.js";

export async function robotSubmitOrder(req, res) {
  try {
    const result = await robotManager.robotProcessOrder(req.body || {});
    return res.json(result);
  } catch (e) {
    console.error("[ROBOT] submit error:", e?.message || e);
    return res.status(500).json({ ok: false, error: "ROBOT_SUBMIT_FAILED" });
  }
}

export function robotListOrders(req, res) {
  try {
    const db = robotManager.loadOrders();
    return res.json({ ok: true, total: db.orders.length, orders: db.orders.slice(0, 200) });
  } catch (e) {
    console.error("[ROBOT] list error:", e?.message || e);
    return res.status(500).json({ ok: false, error: "ROBOT_LIST_FAILED" });
  }
}

export function robotGetMap(req, res) {
  try {
    const map = robotManager.loadMap();
    return res.json({ ok: true, map });
  } catch (e) {
    console.error("[ROBOT] map error:", e?.message || e);
    return res.status(500).json({ ok: false, error: "ROBOT_MAP_FAILED" });
  }
}

export function robotGetRules(req, res) {
  try {
    const rules = robotManager.loadRules();
    return res.json({ ok: true, rules });
  } catch (e) {
    console.error("[ROBOT] rules error:", e?.message || e);
    return res.status(500).json({ ok: false, error: "ROBOT_RULES_FAILED" });
  }
}
