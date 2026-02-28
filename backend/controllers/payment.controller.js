import { createPayment } from "../services/payment.service.js";

export async function createPaymentController(req, res) {
  try {
    const { orderId, title, price, email } = req.body;

    if (!orderId || !price || !email) {
      return res.status(400).json({ ok: false, error: "INVALID_DATA" });
    }

    const payment = await createPayment({
      orderId,
      title: title || "Pedido Nexus",
      price,
      email
    });

    return res.json({
      ok: true,
      init_point: payment.init_point
    });
  } catch (err) {
    console.error("PAYMENT_ERROR:", err);
    return res.status(500).json({ ok: false, error: "PAYMENT_FAILED" });
  }
}