import fs from "fs";
import path from "path";
import { Router } from "express";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUEUE_PATH = path.join(__dirname, "../data/synceeQueue.json");

const router = Router();

router.get("/:orderId", (req, res) => {
  try {
    if (!fs.existsSync(QUEUE_PATH)) {
      return res.status(404).json({ ok: false, error: "NO_ORDERS" });
    }

    const orders = JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
    const order = orders.find(o => o.id === req.params.orderId);

    if (!order) {
      return res.status(404).json({ ok: false, error: "ORDER_NOT_FOUND" });
    }

    return res.json({
      ok: true,
      orderId: order.id,
      status: order.status,
      timeline: buildTimeline(order),
      updatedAt: order.sentAt || order.createdAt
    });

  } catch (err) {
    return res.status(500).json({ ok: false, error: "TRACKING_ERROR" });
  }
});

function buildTimeline(order) {
  const timeline = [];

  timeline.push({ status: "EVALUATING", at: order.createdAt });
  timeline.push({ status: "PENDING", at: order.createdAt });

  if (order.sentAt) {
    timeline.push({ status: "SENT_TO_SUPPLIER", at: order.sentAt });
  }

  if (order.deliveredAt) {
    timeline.push({ status: "DELIVERED", at: order.deliveredAt });
  }

  return timeline;
}

export default router;
