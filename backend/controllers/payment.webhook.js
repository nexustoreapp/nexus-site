// backend/controllers/payment.webhook.js
import fetch from "node-fetch";
import { findUserByEmail, upsertUser } from "../utils/userStore.js";

const MP_TOKEN = process.env.MERCADO_PAGO_TOKEN;

export async function paymentWebhook(req, res) {
  try {
    const paymentId = req.body?.data?.id;
    if (!paymentId) return res.sendStatus(200);

    const r = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${MP_TOKEN}`
        }
      }
    );

    const payment = await r.json();

    if (payment.status !== "approved") {
      return res.sendStatus(200);
    }

    const email = payment.metadata?.userEmail;
    const plan = payment.metadata?.plan;

    if (!email || !plan) return res.sendStatus(200);

    const user = findUserByEmail(email);
    if (!user) return res.sendStatus(200);

    // 🔥 AQUI É ONDE O PLANO SOBE
    user.plan = plan;
    user.updatedAt = Date.now();
    upsertUser(user);

    return res.sendStatus(200);

  } catch (err) {
    console.error("[WEBHOOK ERROR]", err);
    return res.sendStatus(200);
  }
}