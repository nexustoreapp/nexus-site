// backend/controllers/payment.controller.js
import fetch from "node-fetch";

import { ORDER_STATUS } from "../orders/orders.status.js";
import {
  attachPayment,
  addOrderEvent,
  findOrderById,
  updateOrderStatus
} from "../services/orders.service.js";

/**
 * Mercado Pago - criar pagamento (Preference)
 * Espera body parecido com o seu checkout.js:
 * {
 *   email: "cliente@email.com",
 *   items: [{ title, quantity, unit_price, currency_id? }],
 *   orderId?: "uuid/opcional"
 * }
 */
export async function createPaymentController(req, res) {
  try {
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN?.trim();
    if (!MP_ACCESS_TOKEN) {
      return res.status(500).json({
        ok: false,
        error: "MP_ACCESS_TOKEN_NOT_CONFIGURED"
      });
    }

    const { email, items, orderId } = req.body || {};

    // validações “pé no chão”
    if (!email || typeof email !== "string") {
      return res.status(400).json({ ok: false, error: "EMAIL_REQUIRED" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: "ITEMS_REQUIRED" });
    }

    // normaliza itens pro padrão MP
    const mpItems = items.map((it, idx) => {
      const title = (it?.title ?? `Item ${idx + 1}`).toString();
      const quantity = Number(it?.quantity ?? 1);
      const unit_price = Number(it?.unit_price ?? 0);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`INVALID_ITEM_QUANTITY_${idx}`);
      }
      if (!Number.isFinite(unit_price) || unit_price <= 0) {
        throw new Error(`INVALID_ITEM_PRICE_${idx}`);
      }

      return {
        title,
        quantity,
        unit_price,
        currency_id: (it?.currency_id ?? "BRL").toString()
      };
    });

    // URL pública do backend (Render). Use a env do seu projeto.
    const PUBLIC_BACKEND_URL =
      (process.env.PUBLIC_BACKEND_URL || "").replace(/\/+$/, "") ||
      (process.env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "");

    if (!PUBLIC_BACKEND_URL) {
      return res.status(500).json({
        ok: false,
        error: "PUBLIC_BACKEND_URL_NOT_CONFIGURED",
        hint: "Configure PUBLIC_BACKEND_URL (ex: https://nexus-site-oufm.onrender.com)"
      });
    }

    // A notificação do MP (webhook)
    const notification_url = `${PUBLIC_BACKEND_URL}/api/v1/payment/webhook/mercadopago`;

    // Se você tiver orderId, a gente tenta achar e vincular
    let order = null;
    if (orderId) {
      order = await findOrderById(orderId);
      if (!order) {
        return res.status(404).json({
          ok: false,
          error: "ORDER_NOT_FOUND",
          orderId
        });
      }
    }

    // cria preference no Mercado Pago
    const preferencePayload = {
      items: mpItems,
      payer: { email },
      notification_url,
      // você pode personalizar depois:
      back_urls: {
        success: process.env.MP_BACK_SUCCESS || "https://nexustore.store/minha-conta.html",
        pending: process.env.MP_BACK_PENDING || "https://nexustore.store/minha-conta.html",
        failure: process.env.MP_BACK_FAILURE || "https://nexustore.store/minha-conta.html"
      },
      auto_return: "approved",
      metadata: {
        orderId: order?.id || orderId || null,
        email
      }
    };

    const mpResp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(preferencePayload)
    });

    const mpData = await mpResp.json().catch(() => ({}));

    if (!mpResp.ok) {
      return res.status(400).json({
        ok: false,
        error: "MP_PREFERENCE_CREATE_FAILED",
        details: mpData
      });
    }

    // Se tem order, anexa info de pagamento e marca status "payment_pending"
    if (order) {
      await attachPayment(order.id, {
        provider: "mercadopago",
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point
      });

      await updateOrderStatus(order.id, ORDER_STATUS.PAYMENT_PENDING);

      await addOrderEvent(order.id, {
        type: "PAYMENT_PREFERENCE_CREATED",
        payload: {
          provider: "mercadopago",
          preference_id: mpData.id
        }
      });
    }

    return res.json({
      ok: true,
      provider: "mercadopago",
      preferenceId: mpData.id,
      payUrl: mpData.init_point || mpData.sandbox_init_point,
      notification_url
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "PAYMENT_CREATE_ERROR",
      message: err?.message || "unknown_error"
    });
  }
}

/**
 * Controller “genérico” de webhook (se algum lugar do projeto ainda chamar isso).
 * Seu webhook real está em backend/controllers/payment.webhook.js (mercadopagoWebhook)
 */
export async function paymentWebhookController(req, res) {
  return res.json({ ok: true });
}