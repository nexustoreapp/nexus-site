// backend/controllers/payment.webhook.js
import crypto from "crypto";

import {
  findOrderById,
  updateOrderStatus,
  attachPayment,
  ORDER_STATUS
} from "../services/orders.service.js";

/**
 * Webhook genérico (Mercado Pago / outros)
 * A ideia aqui é:
 * - Receber o evento
 * - Identificar o orderId (metadata / external_reference / etc)
 * - Marcar status e anexar infos de pagamento
 *
 * OBS: Validação de assinatura varia por gateway.
 * Aqui deixei um "guard" opcional por header/secret se você quiser ativar.
 */

// Se você quiser travar assinatura:
// - setar WEBHOOK_SECRET no Render
function isValidSignature(req) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true; // se não setou, não bloqueia

  const signature = req.headers["x-webhook-signature"];
  if (!signature) return false;

  // Assinatura simples: HMAC do body stringificado
  // (Cada gateway é diferente; isso serve como “trava” básica)
  const raw = JSON.stringify(req.body || {});
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return signature === expected;
}

function pickOrderIdFromWebhook(body) {
  // Tenta achar orderId onde normalmente vem:
  // 1) metadata.orderId
  // 2) external_reference
  // 3) data.orderId
  if (!body) return null;

  if (body.metadata?.orderId) return body.metadata.orderId;
  if (body.external_reference) return body.external_reference;
  if (body.data?.orderId) return body.data.orderId;

  // fallback: alguns providers mandam "resource" ou "id"
  // mas isso costuma ser id do pagamento, não do pedido.
  return null;
}

function pickPaymentInfo(body) {
  // Normaliza o que dá pra guardar
  return {
    provider: body?.provider || body?.type || "unknown",
    status: body?.status || body?.data?.status || "UNKNOWN",
    externalId: body?.id || body?.data?.id || body?.payment_id || null,
    method: body?.payment_method_id || body?.data?.payment_method_id || null
  };
}

function mapPaymentToOrderStatus(paymentStatus) {
  // Ajuste fino depois, mas já resolve o “fluxo real”
  const s = String(paymentStatus || "").toLowerCase();

  if (s === "approved" || s === "paid" || s === "authorized") {
    return { orderStatus: ORDER_STATUS.PAGO, payStatus: "PAID" };
  }

  if (s === "pending" || s === "in_process" || s === "processing") {
    return { orderStatus: ORDER_STATUS.AGUARDANDO_PAGAMENTO, payStatus: "PENDING" };
  }

  if (s === "cancelled" || s === "canceled" || s === "rejected" || s === "failed") {
    return { orderStatus: ORDER_STATUS.CANCELADO, payStatus: "FAILED" };
  }

  return { orderStatus: ORDER_STATUS.AGUARDANDO_PAGAMENTO, payStatus: "UNKNOWN" };
}

export async function paymentWebhook(req, res) {
  try {
    if (!isValidSignature(req)) {
      return res.status(401).json({ ok: false, error: "INVALID_WEBHOOK_SIGNATURE" });
    }

    const body = req.body || {};
    const orderId = pickOrderIdFromWebhook(body);

    // Se não veio orderId, não dá pra aplicar no pedido
    if (!orderId) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: "NO_ORDER_ID_IN_WEBHOOK"
      });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: "ORDER_NOT_FOUND",
        orderId
      });
    }

    const paymentInfo = pickPaymentInfo(body);
    await attachPayment(orderId, paymentInfo);

    const mapped = mapPaymentToOrderStatus(paymentInfo.status);
    const updated = await updateOrderStatus(orderId, mapped.orderStatus, {
      note: "Webhook payment status update",
      paymentStatus: mapped.payStatus,
      externalPaymentId: paymentInfo.externalId,
      meta: {
        provider: paymentInfo.provider,
        method: paymentInfo.method,
        rawStatus: paymentInfo.status
      }
    });

    return res.status(200).json({
      ok: true,
      orderId,
      orderStatus: updated?.status || null
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "WEBHOOK_ERROR",
      message: err?.message || "unknown"
    });
  }
}