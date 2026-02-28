// backend/controllers/tracking.controller.js
import { getOrderById } from "../services/orders.service.js";

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

export async function getTrackingController(req, res) {
  const user = getUserFromToken(req);
  if (!user?.email) {
    return res.status(401).json({ ok: false, error: "INVALID_OR_EXPIRED_TOKEN" });
  }

  const orderId = req.params.orderId;
  const order = await getOrderById(orderId);
  if (!order) return res.status(404).json({ ok: false, error: "ORDER_NOT_FOUND" });

  if (order.user_email !== user.email) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }

  return res.json({
    ok: true,
    orderId,
    status: order.status,
    events: order.events || []
  });
}