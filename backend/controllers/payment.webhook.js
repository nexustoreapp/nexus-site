// backend/controllers/payment.webhook.js
import {
  findOrderById,
  updateOrderStatus,
  addOrderEvent,
  ORDER_STATUS
} from "../services/orders.service.js";

import { pool } from "../db/pool.js";
import { updateUserPlanByCpf, updateUserPlanByEmail } from "../services/users.service.js";

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function normalizePlan(plan) {
  const p = String(plan || "").trim().toLowerCase();
  if (p === "coretest" || p === "core_teste" || p === "core-teste") return "core_test";
  if (["free", "core", "hyper", "omega", "core_test"].includes(p)) return p;
  return "free";
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeCpf(cpf) {
  return String(cpf || "").replace(/\D/g, "");
}

/**
 * POST/GET /api/v1/payment/webhook/mercadopago
 */
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
      return json(res, 200, { ok: true, received: true, note: "no-payment-id" });
    }

    if (!MP_ACCESS_TOKEN) {
      return json(res, 200, { ok: true, received: true, note: "mp-token-missing" });
    }

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

    const userEmail = normalizeEmail(
      mpPayment?.metadata?.userEmail ||
      mpPayment?.metadata?.user_email ||
      ""
    );

    const userCpf = normalizeCpf(
      mpPayment?.metadata?.userCpf ||
      mpPayment?.metadata?.user_cpf ||
      ""
    );

    const planKey = normalizePlan(
      mpPayment?.metadata?.planKey ||
      mpPayment?.metadata?.plan_key ||
      mpPayment?.metadata?.plan ||
      ""
    );

    // audit em memória (se existir)
    if (orderId) {
      try {
        await addOrderEvent(orderId, {
          type: "PAYMENT_WEBHOOK",
          note: "Webhook Mercado Pago recebido",
          meta: { paymentId, status }
        });
      } catch {}
    }

    // status pedido (memória)
    if (orderId) {
      const order = await findOrderById(orderId);
      if (order) {
        if (status === "approved") {
          await updateOrderStatus(orderId, ORDER_STATUS.PAGO, {
            note: "Pagamento aprovado via Mercado Pago",
            paymentStatus: "PAID",
            externalPaymentId: paymentId
          });
        } else if (["rejected", "cancelled", "refunded", "charged_back"].includes(status)) {
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

    // ✅ ativa plano quando approved
    let planUpdated = false;
    let planUpdatedBy = null;

    if (status === "approved") {

      // 1) PRINCIPAL: CPF
      if (userCpf) {
        const updCpf = await updateUserPlanByCpf(userCpf, planKey);
        planUpdated = !!updCpf?.ok;
        planUpdatedBy = planUpdated ? "cpf" : "cpf_not_found";
      }

      // 2) FALLBACK: orderId -> user_id (DB)
      if (!planUpdated && orderId) {
        try {
          const orderResult = await pool.query(
            `SELECT user_id FROM orders WHERE id = $1`,
            [orderId]
          );

          if (orderResult.rows?.length) {
            const userId = orderResult.rows[0].user_id;

            const u = await pool.query(
              `UPDATE users
               SET plan = $1, updated_at = NOW()
               WHERE id = $2
               RETURNING id`,
              [planKey, userId]
            );

            if (u.rows?.length) {
              planUpdated = true;
              planUpdatedBy = "order_id";
            }
          }
        } catch (e) {
          console.error("orderId->userId update plan error:", e?.message || e);
        }
      }

      // 3) ÚLTIMO FALLBACK: email
      if (!planUpdated && userEmail) {
        const updEmail = await updateUserPlanByEmail(userEmail, planKey);
        planUpdated = !!updEmail?.ok;
        planUpdatedBy = planUpdated ? "email" : "email_not_found";
      }

      // tenta histórico payments (se tabela existir)
      try {
        await pool.query(
          `INSERT INTO payments (provider, external_id, status, amount, currency, user_email, user_cpf, plan, raw, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
          [
            "mercadopago",
            String(paymentId),
            String(status),
            Number(mpPayment?.transaction_amount || 0),
            String(mpPayment?.currency_id || "BRL"),
            userEmail || null,
            userCpf || null,
            String(planKey),
            JSON.stringify(mpPayment || {})
          ]
        );
      } catch {}

      return json(res, 200, {
        ok: true,
        received: true,
        paymentId: String(paymentId),
        status,
        orderId: orderId || null,
        userEmail: userEmail || null,
        userCpf: userCpf || null,
        planKey,
        planUpdated,
        planUpdatedBy
      });
    }

    return json(res, 200, {
      ok: true,
      received: true,
      paymentId: String(paymentId),
      status,
      orderId: orderId || null,
      userEmail: userEmail || null,
      userCpf: userCpf || null,
      planKey: planKey || null
    });

  } catch (err) {
    console.error("webhook error:", err);
    return json(res, 200, { ok: true, received: true, note: "webhook-error" });
  }
}