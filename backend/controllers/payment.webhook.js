// backend/controllers/payment.webhook.js
import crypto from "crypto";

import { ORDER_STATUS } from "../orders/orders.status.js";
import {
  updateOrderStatus,
  findOrderById,
  findOrderByPaymentId
} from "../services/orders.service.js";

/* =========================================================
   WEBHOOK PAGAMENTO (Mercado Pago / genérico)
   - Não depende de front
   - Atualiza status do pedido quando houver confirmação
========================================================= */

/**
 * Verifica assinatura do webhook (opcional).
 * Se você NÃO tiver assinatura habilitada no provedor, pode deixar false.
 */
function verifySignature(req) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return true; // sem secret configurado, não bloqueia

  // Alguns gateways mandam assinatura em headers diferentes
  const sig =
    req.headers["x-signature"] ||
    req.headers["x-webhook-signature"] ||
    req.headers["x-hub-signature"] ||
    "";

  // Se não veio assinatura, rejeita apenas se você quiser ser estrito:
  if (!sig) return false;

  // Corpo raw nem sempre está disponível; aqui usamos JSON stringificado
  const body = JSON.stringify(req.body ?? {});
  const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");

  // compara de forma segura
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(hmac));
  } catch {
    return false;
  }
}

/**
 * Extrai o id do pedido de vários formatos possíveis.
 * Mercado Pago geralmente traz:
 * - data.id / id / resource
 * - ou metadata / external_reference na consulta do pagamento (depende do seu create)
 */
function extractPaymentId(body) {
  if (!body) return null;

  // formatos comuns
  return (
    body?.data?.id ||
    body?.id ||
    body?.payment_id ||
    body?.resource_id ||
    null
  );
}

/**
 * Extrai o id do pedido se vier explícito no webhook
 */
function extractOrderId(body) {
  if (!body) return null;

  return (
    body?.order_id ||
    body?.data?.order_id ||
    body?.metadata?.order_id ||
    body?.external_reference || // dependendo do gateway, pode ser string
    null
  );
}

/**
 * Mapeia status do gateway para status interno
 * Você pode ajustar depois quando conectar o MP real de verdade (consulta pagamento, etc.)
 */
function mapGatewayStatusToOrderStatus(body) {
  const s =
    (body?.status ||
      body?.data?.status ||
      body?.payment?.status ||
      "").toString().toLowerCase();

  if (["approved", "paid", "succeeded", "confirmed"].includes(s)) {
    return ORDER_STATUS.PAGO;
  }

  if (["pending", "in_process", "authorized"].includes(s)) {
    return ORDER_STATUS.AGUARDANDO_PAGAMENTO;
  }

  if (["cancelled", "canceled", "rejected", "failed", "refunded"].includes(s)) {
    return ORDER_STATUS.CANCELADO;
  }

  // fallback: não muda
  return null;
}

/* =========================================================
   Controller principal
========================================================= */
export async function paymentWebhook(req, res) {
  try {
    // 1) assinatura (se estiver ativa)
    const okSig = verifySignature(req);
    if (!okSig) {
      return res.status(401).json({
        ok: false,
        error: "INVALID_WEBHOOK_SIGNATURE"
      });
    }

    const body = req.body || {};

    // 2) identificar pagamento/pedido
    const paymentId = extractPaymentId(body);
    const orderId = extractOrderId(body);

    // 3) mapear status
    const newStatus = mapGatewayStatusToOrderStatus(body);

    // Se não tem status que a gente reconhece, só confirma recebimento
    if (!newStatus) {
      return res.json({
        ok: true,
        received: true,
        ignored: true
      });
    }

    // 4) localizar pedido
    let order = null;

    if (orderId) {
      order = await findOrderById(orderId);
    }

    if (!order && paymentId) {
      order = await findOrderByPaymentId(paymentId);
    }

    if (!order) {
      // webhook chegou antes do pedido existir (ou ids não batem)
      return res.status(202).json({
        ok: true,
        received: true,
        pending_match: true
      });
    }

    // 5) atualizar status do pedido
    await updateOrderStatus(order.id, newStatus, {
      source: "webhook",
      paymentId: paymentId || order.paymentId || null,
      raw: body
    });

    return res.json({
      ok: true,
      received: true,
      orderId: order.id,
      status: newStatus
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "WEBHOOK_INTERNAL_ERROR",
      message: err?.message || "unknown"
    });
  }
}