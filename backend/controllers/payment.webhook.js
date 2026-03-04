import mercadopago from "mercadopago";
import { createOrder } from "../services/orders.service.js";

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

export async function createPayment(req, res) {

  try {

    const user = req.user;
    const { items, amountCents, currency } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ ok:false, error:"items_missing" });
    }

    const planId = items[0].id;

    /* ===============================
       CRIA PEDIDO NO BANCO
    =============================== */

    const order = await createOrder({
      userId: user.id,
      plan: planId,
      amountCents
    });

    const orderId = order.id;

    /* ===============================
       CRIA PAGAMENTO MERCADO PAGO
    =============================== */

    const preference = {
      items: items,
      external_reference: String(orderId),

      back_urls: {
        success: "https://nexus-site-oufm.onrender.com/success.html",
        failure: "https://nexus-site-oufm.onrender.com/failure.html",
        pending: "https://nexus-site-oufm.onrender.com/pending.html"
      },

      auto_return: "approved",

      notification_url:
        "https://nexus-site-oufm.onrender.com/payment/webhook"
    };

    const response = await mercadopago.preferences.create(preference);

    res.json({
      ok:true,
      init_point: response.body.init_point,
      sandbox_init_point: response.body.sandbox_init_point
    });

  } catch (err) {

    console.error("createPayment error:", err);

    res.status(500).json({
      ok:false,
      error:"payment_create_error"
    });

  }

}