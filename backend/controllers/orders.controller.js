// backend/controllers/orders.controller.js
import {
  getOrdersByUser,
  getOrderById
} from "../services/order.service.js";

export function listMyOrders(req, res) {
  const user = req.user;
  const orders = getOrdersByUser(user.email);
  return res.json({ ok: true, orders });
}

export function getOrder(req, res) {
  const { id } = req.params;
  const order = getOrderById(id);

  if (!order) {
    return res.status(404).json({ ok: false });
  }

  if (order.userEmail !== req.user.email) {
    return res.status(403).json({ ok: false });
  }

  return res.json({ ok: true, order });
}