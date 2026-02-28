// backend/controllers/payment.webhook.js
import fetch from "node-fetch";
import {
  findOrderByProviderReference,
  recordPayment,
  updateOrderStatus,
  ORDER_STATUS
} from "../services/orders.service.js";

/**
 * Webhook Mercado Pago:
 * - recebe notificação
 * - busca pagamento no MP
 * - identifica orderId via external_reference
 * - grava payment + atualiza status do pedido
 */
export async function mercadopagoWebhook(req, res) {
  try {
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!MP_ACCESS_TOKEN) return res.status(500).json({ ok: false, error: "PAYMENT_NOT_CONFIGURED" });

    // MP envia params diferentes dependendo do tipo
    const type = req.query.type || req.body?.type;
    const dataId = req.query["data.id"] || req.body?.data?.id || req.body?.id;

    // Avisa MP "ok recebi" mesmo se for ruído, pra evitar retry infinito
    if (!dataId) return res.json({ ok: true, ignored: true });

    // buscamos detalhes do pagamento
    // doc: /v1/payments/:id
    const pr = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
    });

    const payment = await pr.json();
    if (!pr.ok) return res.json({ ok: true, ignored: true });

    const orderId = payment?.external_reference;
    if (!orderId) return res.json({ ok: true, ignored: true });

    // Confirma que existe pedido vinculado ao provider ref (preference id) OU só pelo orderId
    // Aqui vamos pelo orderId direto (external_reference é o id do pedido)
    const status = payment?.status || "unknown";

    await recordPayment({
      orderId,
      provider: "mercadopago",
      providerPaymentId: String(payment?.id || dataId),
      status,
      raw: payment
    });

    if (status === "approved") {
      await updateOrderStatus(orderId, ORDER_STATUS.PAGO, "Pagamento aprovado (Mercado Pago).", {
        provider_payment_id: payment?.id,
        payment_status: status
      });
    } else if (status === "rejected" || status === "cancelled") {
      await updateOrderStatus(orderId, ORDER_STATUS.CANCELADO, "Pagamento recusado/cancelado (Mercado Pago).", {
        provider_payment_id: payment?.id,
        payment_status: status
      });
    } else {
      // pending/in_process/etc
      await updateOrderStatus(orderId, ORDER_STATUS.AGUARDANDO_PAGAMENTO, "Pagamento pendente/em processamento (Mercado Pago).", {
        provider_payment_id: payment?.id,
        payment_status: status
      });
    }

    return res.json({ ok: true });
  } catch (e) {
    // não derruba o webhook
    return res.json({ ok: true, error: "WEBHOOK_HANDLED_WITH_ERROR" });
  }
}