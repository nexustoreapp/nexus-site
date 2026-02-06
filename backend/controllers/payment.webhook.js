// backend/controllers/payment.webhook.js
import { createOrder } from "../services/order.service.js";

export async function paymentWebhook(req, res) {
  try {
    const data = req.body;

    // Mercado Pago / futuro gateway
    const status = data?.data?.status || data?.status;
    const paymentId = data?.data?.id || data?.id;
    const metadata = data?.data?.metadata || data?.metadata;

    if (status !== "approved") {
      return res.json({ ok: true });
    }

    if (!metadata?.userEmail || !metadata?.productId) {
      return res.status(400).json({ ok: false });
    }

    const order = createOrder({
      userEmail: metadata.userEmail,
      productId: metadata.productId,
      paymentId
    });

    return res.json({
      ok: true,
      orderId: order.id
    });

  } catch (err) {
    console.error("[PAYMENT WEBHOOK]", err);
    return res.status(500).json({ ok: false });
  }
}