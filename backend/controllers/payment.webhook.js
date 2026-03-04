import { updateOrderStatus } from "../services/orders.service.js";
import { updateUserPlan } from "../services/users.service.js";
import mercadopago from "mercadopago";

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

export async function mercadopagoWebhook(req, res) {

  try {

    console.log("Webhook recebido:", req.body);

    const paymentId = req.body?.data?.id;

    if (!paymentId) {
      console.log("Webhook sem paymentId");
      return res.status(200).json({ ok: true });
    }

    // consulta pagamento real no Mercado Pago
    const payment = await mercadopago.payment.findById(paymentId);

    const status = payment.body.status;
    const orderId = payment.body.external_reference;

    if (!orderId) {
      console.log("Pagamento sem external_reference");
      return res.status(200).json({ ok: true });
    }

    console.log("Status pagamento:", status);
    console.log("OrderId:", orderId);

    if (status === "approved") {

      await updateOrderStatus(orderId, "paid");

      const plan = "core_test";

      await updateUserPlan(orderId, plan);

      console.log("Plano ativado:", plan);

    }

    res.status(200).json({ ok: true });

  } catch (err) {

    console.error("Erro webhook:", err);

    res.status(500).json({ error: "webhook_error" });

  }

}