// backend/controllers/payment.webhook.js

import crypto from "crypto";
import {
  updateOrderStatus,
  applyFornecedorDecision
} from "../services/orders.service.js";
import { ORDER_STATUS } from "../orders/orders.status.js";

/**
 * Webhook genérico de pagamento
 * Compatível com Stripe, Mercado Pago, etc.
 * (gateway real entra depois sem refatoração)
 */
export async function paymentWebhook(req, res) {
  try {
    const signature = req.headers["x-signature"] || null;
    const payload = req.body;

    // 🔐 Verificação mínima (placeholder seguro)
    if (!payload || !payload.orderId || !payload.status) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_WEBHOOK_PAYLOAD"
      });
    }

    const { orderId, status, transactionId } = payload;

    // ✅ Pagamento confirmado
    if (status === "paid" || status === "approved") {
      const updated = updateOrderStatus(orderId, ORDER_STATUS.PAGO, {
        transactionId
      });

      if (!updated) {
        return res.status(404).json({
          ok: false,
          error: "ORDER_NOT_FOUND"
        });
      }

      // 🤖 Decisão automática de fornecedor
      applyFornecedorDecision(orderId);

      return res.json({
        ok: true,
        message: "Pagamento confirmado e pedido processado"
      });
    }

    // ❌ Pagamento recusado / falhou
    if (status === "failed" || status === "canceled") {
      updateOrderStatus(orderId, ORDER_STATUS.CANCELADO, {
        reason: status
      });

      return res.json({
        ok: true,
        message: "Pagamento recusado"
      });
    }

    // 🟡 Status ignorado (mantém compatibilidade futura)
    return res.json({
      ok: true,
      message: "Status ignorado"
    });

  } catch (err) {
    console.error("WEBHOOK_ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "WEBHOOK_INTERNAL_ERROR"
    });
  }
}