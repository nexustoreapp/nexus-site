// backend/controllers/payment.webhook.js
import { updateOrderStatus, addOrderEvent } from "../services/orders.service.js";

function safeJson(value) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return value;
  }
}

/**
 * Webhook genérico (Mercado Pago / outro gateway)
 * Você vai mapear depois o payload real do provedor.
 */
export async function paymentWebhook(req, res) {
  const body = safeJson(req.body);

  // Tentativas comuns de achar orderId dentro de payloads diferentes:
  const orderId =
    body?.data?.order_id ||
    body?.order_id ||
    body?.metadata?.order_id ||
    body?.external_reference ||
    body?.reference;

  const paymentStatus =
    body?.data?.status ||
    body?.status ||
    body?.payment_status ||
    body?.event?.status;

  if (!orderId) {
    return res.status(400).json({ ok: false, error: "WEBHOOK_MISSING_ORDER_ID" });
  }

  // Loga evento bruto no histórico do pedido (pra auditoria)
  try {
    await addOrderEvent(orderId, "PAYMENT_WEBHOOK_RECEIVED", { body });
  } catch {
    // se o pedido ainda não existir, não quebra o webhook
  }

  // Mapeamento mínimo (você pode refinar depois por gateway)
  let nextOrderStatus = null;

  if (paymentStatus === "approved" || paymentStatus === "paid" || paymentStatus === "authorized") {
    nextOrderStatus = "PAGO";
  } else if (paymentStatus === "refunded" || paymentStatus === "cancelled" || paymentStatus === "canceled") {
    nextOrderStatus = "CANCELADO";
  } else if (paymentStatus === "pending" || paymentStatus === "in_process") {
    nextOrderStatus = "AGUARDANDO_PAGAMENTO";
  }

  if (nextOrderStatus) {
    const r = await updateOrderStatus(orderId, nextOrderStatus, {
      provider_ref: body?.id || body?.data?.id || null
    });

    if (!r.ok) {
      return res.status(404).json(r);
    }
  }

  return res.status(200).json({ ok: true });
}

export default paymentWebhook;