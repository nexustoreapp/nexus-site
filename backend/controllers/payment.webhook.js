// backend/controllers/payment.webhook.js
import crypto from "crypto";

import {
  ORDER_STATUS,
  findOrderById,
  updateOrderStatus,
  addOrderEvent
} from "../services/orders.service.js";

/**
 * Helpers
 */
function json(res, status, payload) {
  return res.status(status).json(payload);
}

function signHmac(secret, raw) {
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

/**
 * Mercado Pago Webhook
 * Esperado: POST /api/v1/payment/webhook
 *
 * Observação:
 * - O Mercado Pago pode enviar payloads diferentes dependendo do tipo de notificação
 * - Aqui a gente registra evento e, se identificar "approved", marca como PAGO
 */
export async function mercadopagoWebhook(req, res) {
  try {
    const payload = req.body || {};

    // (opcional) valida assinatura se você configurar um secret seu
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (secret) {
      const sig = req.get("x-signature") || req.get("X-Signature") || "";
      const raw = JSON.stringify(payload);
      const expected = signHmac(secret, raw);

      if (!sig || sig !== expected) {
        return json(res, 401, { ok: false, error: "WEBHOOK_INVALID_SIGNATURE" });
      }
    }

    // tenta achar orderId onde o MP costuma carregar
    const orderId =
      payload?.external_reference ||
      payload?.metadata?.orderId ||
      payload?.metadata?.order_id ||
      payload?.orderId ||
      payload?.order_id ||
      null;

    // Se não veio orderId, não derruba o servidor: só acusa recebimento
    if (!orderId) {
      return json(res, 200, { ok: true, received: true, note: "no-order-id" });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return json(res, 404, { ok: false, error: "ORDER_NOT_FOUND", orderId });
    }

    // status pode vir em vários formatos
    const mpStatus =
      payload?.status ||
      payload?.data?.status ||
      payload?.payment_status ||
      payload?.action ||
      null;

    // registra evento do webhook (audit trail)
    await addOrderEvent(orderId, {
      note: "Webhook Mercado Pago recebido",
      meta: { mpStatus, payload }
    });

    // regra simples: se aprovado, marca PAGO
    if (String(mpStatus || "").toLowerCase() === "approved") {
      await updateOrderStatus(orderId, ORDER_STATUS.PAGO, {
        note: "Pagamento aprovado via webhook",
        paymentStatus: "PAID",
        externalPaymentId: payload?.data?.id || payload?.id || null
      });
    }

    return json(res, 200, { ok: true, received: true, orderId });
  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: "WEBHOOK_ERROR",
      message: err?.message || String(err)
    });
  }
}

/**
 * Compat: caso algum lugar do projeto esteja importando outro nome,
 * a gente reaproveita a mesma função sem duplicar lógica.
 */
export const paymentWebhookController = mercadopagoWebhook;
export default mercadopagoWebhook;