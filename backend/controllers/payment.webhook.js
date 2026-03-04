// backend/controllers/payment.webhook.js

import {
  findOrderById,
  updateOrderStatus,
  addOrderEvent,
  ORDER_STATUS
} from "../services/orders.service.js";

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
      process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;

    const payload = req.body || {};

    const paymentId =
      payload?.data?.id ||
      payload?.id ||
      req.query?.id ||
      req.query?.["data.id"] ||
      null;

    if (!paymentId) {
      return json(res,200,{ ok:true, received:true });
    }

    const r = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers:{
          Authorization:`Bearer ${MP_ACCESS_TOKEN}`
        }
      }
    );

    const mpPayment = await r.json();

    const status = String(mpPayment?.status || "").toLowerCase();

    const orderId =
      mpPayment?.external_reference ||
      mpPayment?.metadata?.orderId ||
      mpPayment?.metadata?.order_id ||
      null;

    const planKey = normalizePlan(
      mpPayment?.metadata?.planKey ||
      mpPayment?.metadata?.plan
    );

    if (!orderId) {
      return json(res,200,{ ok:true, received:true, note:"no-order-id" });
    }

    /* ===============================
       ATUALIZA STATUS DO PEDIDO
    =============================== */

    if (status === "approved") {

      await updateOrderStatus(
        orderId,
        ORDER_STATUS.PAGO,
        {
          paymentStatus:"PAID",
          externalPaymentId:paymentId
        }
      );

      /* ===============================
         ATUALIZA PLANO DO USUÁRIO
      =============================== */

      const orderResult = await pool.query(
        `SELECT user_id FROM orders WHERE id = $1`,
        [orderId]
      );

      if (orderResult.rows.length) {

        const userId = orderResult.rows[0].user_id;

        await pool.query(
          `UPDATE users
           SET plan = $1,
           updated_at = NOW()
           WHERE id = $2`,
          [planKey,userId]
        );

        console.log("Plano atualizado:", userId, planKey);
      }

    }

    return json(res,200,{
      ok:true,
      paymentId,
      status,
      orderId,
      planKey
    });

  } catch(err) {

    console.error("Webhook error:",err);

    return json(res,200,{
      ok:true,
      error:true
    });

  }

}