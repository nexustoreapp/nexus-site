import fs from "fs";
import path from "path";

const ORDERS_PATH = path.resolve("backend/data/orders.json");

function readOrders() {
  if (!fs.existsSync(ORDERS_PATH)) return [];
  return JSON.parse(fs.readFileSync(ORDERS_PATH, "utf-8"));
}

export function listUserOrders(req, res) {
  try {
    const user = req.user;
    const orders = readOrders().filter(
      o => o.userEmail === user.email
    );

    return res.json({ ok: true, orders });
  } catch (err) {
    console.error("[ORDERS LIST]", err);
    return res.status(500).json({ ok:false, error:"SERVER_ERROR" });
  }
}