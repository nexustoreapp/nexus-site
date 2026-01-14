// backend/controllers/orders.controller.js
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const ORDERS_FILE = path.resolve("backend/data/orders.json");

function loadOrders() {
  if (!existsSync(ORDERS_FILE)) return [];
  return JSON.parse(readFileSync(ORDERS_FILE, "utf-8"));
}

export function getMyOrders(req, res) {
  try {
    const user = req.user;

    const orders = loadOrders().filter(
      o => o.userEmail === user.email
    );

    return res.json({
      ok: true,
      orders
    });

  } catch (err) {
    console.error("[GET ORDERS]", err);
    return res.status(500).json({
      ok: false,
      error: "SERVER_ERROR"
    });
  }
}