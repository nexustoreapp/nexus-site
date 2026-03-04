import {
  findOrderById,
  updateOrderStatus,
  addOrderEvent,
  ORDER_STATUS
} from "../services/orders.service.js";

import { updateUserPlanByEmail } from "../services/users.service.js";
import { pool } from "../db/pool.js";

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function normalizePlan(plan) {
  const p = String(plan || "").trim().toLowerCase();

  if (p === "coretest" || p === "core_teste" || p === "core-teste") return "core_test";
  if (["free","core","hyper","omega","core_test"].includes(p)) return p;

  return "free";
}

export async function mercadopagoWebhook(req, res) {
  try {

    const MP_ACCESS_TOKEN =
      process.env.MP_ACCESS_TOKEN ||
      process.env.MERCADOPAGO_ACCESS_TOKEN;

    const payload = req.body || {};

    const paymentId =
      payload?.data?.id ||
      payload?.id ||
      req.query?.id ||
      req.query?.["data.id"] ||
      null;

    if (!paymentId) {
      return json(res,200,{ok:true,received:true,note:"no-payment-id"});
    }

    const r = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers:{Authorization:`Bearer ${MP_ACCESS_TOKEN}`} }
    );

    const mpPayment = await r.json();

    const status = String(mpPayment?.status || "").toLowerCase();

    const orderId =
      mpPayment?.external_reference ||
      mpPayment?.metadata?.orderId ||
      mpPayment?.metadata?.order_id ||
      null;

    const userEmail =
      mpPayment?.metadata?.userEmail ||
      mpPayment?.metadata?.user_email ||
      "";

    const planKey = normalizePlan(
      mpPayment?.metadata?.planKey ||
      mpPayment?.metadata?.plan_key ||
      mpPayment?.metadata?.plan ||
      ""
    );

    if (orderId) {
      try {
        await addOrderEvent(orderId,{
          type:"PAYMENT_WEBHOOK",
          note:"Webhook MercadoPago",
          meta:{paymentId,status}
        });
      } catch {}
    }

    if (orderId) {

      const order = await findOrderById(orderId);

      if (order && status === "approved") {

        await updateOrderStatus(orderId,ORDER_STATUS.PAGO,{
          paymentStatus:"PAID",
          externalPaymentId:paymentId
        });

      }

    }

    let planUpdated = false;

    if (status === "approved" && userEmail) {

      const upd = await updateUserPlanByEmail(userEmail,planKey);

      planUpdated = upd?.ok || false;

      try {

        await pool.query(
          `INSERT INTO payments
          (provider,external_id,status,amount,currency,user_email,plan,raw,created_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
          [
            "mercadopago",
            String(paymentId),
            status,
            Number(mpPayment?.transaction_amount || 0),
            String(mpPayment?.currency_id || "BRL"),
            String(userEmail),
            String(planKey),
            JSON.stringify(mpPayment)
          ]
        );

      } catch {}

    }

    return json(res,200,{
      ok:true,
      received:true,
      paymentId,
      status,
      orderId,
      userEmail,
      planKey,
      planUpdated
    });

  } catch(err) {

    console.error("Webhook error:",err);

    return json(res,200,{
      ok:true,
      received:true,
      note:"webhook-error"
    });

  }
}