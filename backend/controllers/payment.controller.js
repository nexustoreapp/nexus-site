// backend/controllers/payment.controller.js
import fetch from "node-fetch";
import { findUserByEmail, upsertUser } from "../utils/userStore.js";

const MP_TOKEN = process.env.MERCADO_PAGO_TOKEN;

export async function createPayment(req, res) {
  try {
    const user = req.user;
    const { plan } = req.body;

    if (!plan) {
      return res.status(400).json({ ok:false, error:"PLAN_REQUIRED" });
    }

    const prices = {
      core: 499,
      hyper: 1990,
      omega: 14990
    };

    if (!prices[plan]) {
      return res.status(400).json({ ok:false, error:"INVALID_PLAN" });
    }

    const payment = {
      transaction_amount: prices[plan] / 100,
      description: `Plano Nexus ${plan}`,
      payment_method_id: "pix",
      payer: {
        email: user.email
      },
      metadata: {
        plan,
        userEmail: user.email
      },
      notification_url: `${process.env.BASE_URL}/api/payment/webhook`
    };

    const r = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payment)
    });

    const d = await r.json();

    return res.json({
      ok:true,
      paymentId: d.id,
      qrCode: d.point_of_interaction?.transaction_data?.qr_code,
      qrCodeBase64: d.point_of_interaction?.transaction_data?.qr_code_base64
    });

  } catch (err) {
    console.error("[CREATE PAYMENT]", err);
    return res.status(500).json({ ok:false, error:"SERVER_ERROR" });
  }
}