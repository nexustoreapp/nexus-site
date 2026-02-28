import MercadoPago from "../config/mercadopago.js";
import { updateOrderStatus } from "../services/orders.service.js";
import { ORDER_STATUS } from "../orders/orders.status.js";

export async function paymentWebhook(req, res) {
  try {
    const { type, data } = req.body;

    if (type !== "payment") {
      return res.sendStatus(200);
    }

    const payment = await MercadoPago.payment.findById(data.id);
    const status = payment.body.status;
    const orderId = payment.body.external_reference;

    if (!orderId) {
      return res.sendStatus(200);
    }

    if (status === "approved") {
      await updateOrderStatus(orderId, ORDER_STATUS.PAGO);
    }

    if (status === "rejected" || status === "cancelled") {
      await updateOrderStatus(orderId, ORDER_STATUS.CANCELADO);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("WEBHOOK_ERROR:", err);
    return res.sendStatus(500);
  }
}