// backend/controllers/payment.webhook.js
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
  if (["free", "core", "hyper", "omega", "core_test"].includes(p)) return p;
  return "free";
}

/**
 * POST /api/v1/payment/webhook/mercadopago
 */
export async function mercadopagoWebhook(req, res) {
  try {
    const MP_ACCESS_TOKEN =
      process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;

    const payload = req.body || {};

    // MercadoPago costuma mandar { data: { id } }
    const paymentId =
      payload?.data?.id ||
      payload?.id ||
      req.query?.id ||
      req.query?.["data.id"] ||
      null;

    if (!paymentId) {
      return json(res, 200, { ok: true, received: true, note: "no-payment-id" });
    }

    if (!MP_ACCESS_TOKEN) {
      return json(res, 200, { ok: true, received: true, note: "mp-token-missing" });
    }

    // Busca detalhes do pagamento no MP (fonte da verdade)
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
    });

    const mpPayment = await r.json().catch(() => null);

    if (!r.ok || !mpPayment) {
      return json(res, 200, { ok: true, received: true, note: "mp-fetch-failed" });
    }

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

    // Log evento no pedido (se existir em memória)
    if (orderId) {
      try {
        await addOrderEvent(orderId, {
          type: "PAYMENT_WEBHOOK",
          note: "Webhook Mercado Pago recebido",
          meta: { paymentId, status }
        });
      } catch {}
    }

    // Atualiza status do pedido em memória (se existir)
    if (orderId) {
      const order = await findOrderById(orderId);

      if (order) {
        if (status === "approved") {
          await updateOrderStatus(orderId, ORDER_STATUS.PAGO, {
            note: "Pagamento aprovado via Mercado Pago",
            paymentStatus: "PAID",
            externalPaymentId: paymentId
          });
        } else if (
          status === "rejected" ||
          status === "cancelled" ||
          status === "refunded" ||
          status === "charged_back"
        ) {
          await updateOrderStatus(orderId, ORDER_STATUS.CANCELADO, {
            note: `Pagamento ${status} via Mercado Pago`,
            paymentStatus: status.toUpperCase(),
            externalPaymentId: paymentId
          });
        } else {
          await updateOrderStatus(orderId, ORDER_STATUS.AGUARDANDO_PAGAMENTO, {
            note: `Pagamento em andamento (${status})`,
            paymentStatus: status.toUpperCase(),
            externalPaymentId: paymentId
          });
        }
      }
    }

    // ✅ AQUI É O PULO DO GATO: ativa plano no Postgres quando approved
    if (status === "approved" && userEmail) {
      const upd = await updateUserPlanByEmail(userEmail, planKey);

      // tenta registrar histórico de pagamento se existir tabela
      // (se não existir, só ignora)
      try {
        await pool.query(
          `INSERT INTO payments (provider, external_id, status, amount, currency, user_email, plan, raw, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
          [
            "mercadopago",
            String(paymentId),
            String(status),
            Number(mpPayment?.transaction_amount || 0),
            String(mpPayment?.currency_id || "BRL"),
            String(userEmail),
            String(planKey),
            JSON.stringify(mpPayment || {})
          ]
        );
      } catch {}

      return json(res, 200, {
        ok: true,
        received: true,
        paymentId,
        status,
        orderId: orderId || null,
        userEmail,
        planKey,
        planUpdated: !!upd?.ok
      });
    }

    return json(res, 200, {
      ok: true,
      received: true,
      paymentId,
      status,
      orderId: orderId || null,
      userEmail: userEmail || null,
      planKey: planKey || null
    });
  } catch (err) {
    console.error("webhook error:", err);
    // webhook NUNCA deve derrubar
    return json(res, 200, {
      ok: true,
      received: true,
      note: "webhook-error",
      message: err?.message || String(err)
    });
  }
}