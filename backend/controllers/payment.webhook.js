import { updateOrderStatus } from "../services/orders.service.js";
import { ORDER_STATUS } from "../orders/orders.status.js";

export async function paymentWebhook(req, res) {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_WEBHOOK_DATA"
      });
    }

    if (status === "PAID") {
      await updateOrderStatus(orderId, ORDER_STATUS.PAGO);
    }

    return res.json({ ok: true });

  } catch (err) {
    console.error("[PAYMENT WEBHOOK]", err);
    return res.status(500).json({
      ok: false,
      error: "WEBHOOK_ERROR"
    });
  }
}