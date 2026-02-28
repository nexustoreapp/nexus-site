// backend/controllers/orders.controller.js
import { createOrder, getOrderById, listOrdersByUserEmail } from "../services/orders.service.js";

function getUserFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;

  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8"));
    return payload || null;
  } catch {
    return null;
  }
}

export async function createOrderController(req, res) {
  const user = getUserFromToken(req);
  if (!user?.email) {
    return res.status(401).json({ ok: false, error: "INVALID_OR_EXPIRED_TOKEN" });
  }

  const { items, amountCents } = req.body || {};
  const userCpf = user.cpf || null;

  const { orderId } = await createOrder({
    userEmail: user.email,
    userCpf,
    items: Array.isArray(items) ? items : [],
    amountCents: Number(amountCents || 0),
    currency: "BRL"
  });

  return res.json({ ok: true, orderId });
}

export async function getOrderController(req, res) {
  const user = getUserFromToken(req);
  if (!user?.email) {
    return res.status(401).json({ ok: false, error: "INVALID_OR_EXPIRED_TOKEN" });
  }

  const orderId = req.params.id;
  const order = await getOrderById(orderId);

  if (!order) return res.status(404).json({ ok: false, error: "ORDER_NOT_FOUND" });

  // dono do pedido
  if (order.user_email !== user.email) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }

  return res.json({ ok: true, order });
}

export async function listMyOrdersController(req, res) {
  const user = getUserFromToken(req);
  if (!user?.email) {
    return res.status(401).json({ ok: false, error: "INVALID_OR_EXPIRED_TOKEN" });
  }

  const orders = await listOrdersByUserEmail(user.email);
  return res.json({ ok: true, orders });
}