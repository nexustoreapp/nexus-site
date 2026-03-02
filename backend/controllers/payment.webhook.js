import { attachPayment } from "../services/orders.service.js";

export async function mercadopagoWebhook(req, res) {
  try {
    const body = req.body;

    console.log("📩 Webhook recebido do Mercado Pago:", body);

    const paymentId = body?.data?.id;

    if (!paymentId) {
      return res.status(200).send("ok");
    }

    const token = process.env.MP_ACCESS_TOKEN;

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const payment = await response.json();

    const status = payment.status;
    const orderId = payment.external_reference;

    console.log("💰 Status pagamento:", status);

    await attachPayment({
      orderId,
      paymentId,
      status,
      amount: payment.transaction_amount,
    });

    res.status(200).send("ok");
  } catch (error) {
    console.error("❌ erro webhook:", error);
    res.status(500).send("erro webhook");
  }
}