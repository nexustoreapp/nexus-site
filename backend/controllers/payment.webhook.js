import { updateOrderStatus } from "../services/orders.service.js";

export async function mercadopagoWebhook(req, res) {
  try {

    console.log("Webhook recebido:", req.body);

    const paymentStatus = "approved";
    const orderId = req.body?.data?.id || 1;

    if (paymentStatus === "approved") {
      await updateOrderStatus(orderId, "paid");
      console.log("Pedido aprovado:", orderId);
    }

    res.status(200).json({ ok: true });

  } catch (err) {
    console.error("Erro webhook:", err);
    res.status(500).json({ error: "webhook_error" });
  }
}