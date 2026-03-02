// backend/controllers/payment.webhook.js
import {
  findOrderById,
  updateOrderStatus,
  addOrderEvent,
  ORDER_STATUS
} from "../services/orders.service.js";

function json(res, status, payload) {
  return res.status(status).json(payload);
}

/**
 * POST /api/v1/payment/webhook/mercadopago
 * - No MP, muitas vezes o webhook vem com { data: { id } }
 * - A forma mais confiável é buscar o pagamento pelo ID na API do MP
 */
export async function mercadopagoWebhook(req, res) {
  try {
    const MP_ACCESS_TOKEN =
      process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;

    const payload = req.body || {};
    const paymentId = payload?.data?.id || payload?.id || null;

    if (!paymentId) {
      // webhook genérico sem id
      return json(res, 200, { ok: true, received: true, note: "no-payment-id" });
    }

    if (!MP_ACCESS_TOKEN) {
      // sem token não dá pra consultar o pagamento (mas não vamos derrubar o webhook)
      return json(res, 200, { ok: true, received: true, note: "mp-token-missing" });
    }

    // Busca detalhes do pagamento no MP
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
    });

    const mpPayment = await r.json().catch(() => null);

    if (!r.ok || !mpPayment) {
      return json(res, 200, { ok: true, received: true, note: "mp-fetch-failed" });
    }

    const orderId =
      mpPayment?.external_reference ||
      mpPayment?.metadata?.orderId ||
      mpPayment?.metadata?.order_id ||
      null;

    if (!orderId) {
      return json(res, 200, { ok: true, received: true, note: "no-order-id" });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return json(res, 200, { ok: true, received: true, note: "order-not-found", orderId });
    }

    const status = String(mpPayment?.status || "").toLowerCase();

    await addOrderEvent(orderId, {
      note: "Webhook Mercado Pago recebido",
      meta: { paymentId, status, mpPayment }
    });

    // Mapeamento simples de status
    if (status === "approved") {
      await updateOrderStatus(orderId, ORDER_STATUS.PAGO, {
        note: "Pagamento aprovado via Mercado Pago",
        paymentStatus: "PAID",
        externalPaymentId: paymentId
      });
    } else if (status === "rejected" || status === "cancelled" || status === "refunded" || status === "charged_back") {
      await updateOrderStatus(orderId, ORDER_STATUS.CANCELADO, {
        note: `Pagamento ${status} via Mercado Pago`,
        paymentStatus: status.toUpperCase(),
        externalPaymentId: paymentId
      });
    } else {
      // pending / in_process / authorized etc
      await updateOrderStatus(orderId, ORDER_STATUS.AGUARDANDO_PAGAMENTO, {
        note: `Pagamento em andamento (${status})`,
        paymentStatus: status.toUpperCase(),
        externalPaymentId: paymentId
      });
    }

    return json(res, 200, { ok: true, received: true, orderId, paymentId, status });
  } catch (err) {
    return json(res, 200, { ok: true, received: true, note: "webhook-error", message: err?.message || String(err) });
  }
}