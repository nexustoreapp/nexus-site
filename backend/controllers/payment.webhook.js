// backend/controllers/payment.webhook.js

import { updateOrderStatus } from "../services/orders.service.js";
import { ORDER_STATUS } from "../orders/orders.status.js";

/**
 * Webhook de pagamento
 * Este endpoint é chamado pelo provedor de pagamento
 * quando ocorre uma mudança de status (ex: pagamento aprovado)
 */
export async function paymentWebhook(req, res) {
  try {
    const event = req.body;

    /**
     * Estrutura esperada (exemplo):
     * {
     *   type: "payment.approved",
     *   data: {
     *     orderId: "order_123"
     *   }
     * }
     */

    if (!event || !event.type || !event.data) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_WEBHOOK_PAYLOAD"
      });
    }

    const { orderId } = event.data;

    if (!orderId) {
      return res.status(400).json({
        ok: false,
        error: "ORDER_ID_NOT_FOUND"
      });
    }

    // Pagamento aprovado
    if (event.type === "payment.approved") {
      const updatedOrder = updateOrderStatus(
        orderId,
        ORDER_STATUS.PAGO
      );

      if (!updatedOrder) {
        return res.status(404).json({
          ok: false,
          error: "ORDER_NOT_FOUND"
        });
      }

      return res.status(200).json({
        ok: true,
        status: "ORDER_MARKED_AS_PAID",
        order: updatedOrder
      });
    }

    // Evento ignorado (não tratado ainda)
    return res.status(200).json({
      ok: true,
      ignored: true,
      event: event.type
    });

  } catch (error) {
    console.error("PAYMENT_WEBHOOK_ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "PAYMENT_WEBHOOK_INTERNAL_ERROR"
    });
  }
}