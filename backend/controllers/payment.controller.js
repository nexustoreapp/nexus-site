// backend/controllers/payment.controller.js
import crypto from "crypto";

import {
  ORDER_STATUS,
  createOrder,
  attachPayment,
  updateOrderStatus,
  addOrderEvent,
  findOrderById
} from "../services/orders.service.js";

/**
 * Helpers
 */
function json(res, status, payload) {
  return res.status(status).json(payload);
}

function getBaseUrl(req) {
  // tenta pegar o domínio real do Render
  const proto =
    (req.headers["x-forwarded-proto"] || "").split(",")[0]?.trim() ||
    req.protocol ||
    "https";
  const host =
    (req.headers["x-forwarded-host"] || "").split(",")[0]?.trim() ||
    req.get("host");
  return `${proto}://${host}`;
}

function safeNumber(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function signHmac(secret, raw) {
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

/**
 * Controller: cria pagamento (Mercado Pago)
 * Rota esperada: POST /api/v1/payment/create
 *
 * Body mínimo sugerido:
 * {
 *   "userId": "xxx",
 *   "items": [{ "id":"sku", "title":"Produto", "unit_price": 10.5, "quantity": 1 }],
 *   "shipping": { "address": {...}, "method":"PAC", "etaDays": 7 }
 * }
 */
export async function createPaymentController(req, res) {
  try {
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!MP_ACCESS_TOKEN) {
      return json(res, 500, {
        ok: false,
        error: "MERCADOPAGO_TOKEN_MISSING",
        hint: "Crie a env MP_ACCESS_TOKEN (ou MERCADOPAGO_ACCESS_TOKEN) no Render."
      });
    }

    const body = req.body || {};
    const baseUrl = getBaseUrl(req);

    const itemsIn = Array.isArray(body.items) ? body.items : [];
    if (!itemsIn.length) {
      return json(res, 400, {
        ok: false,
        error: "INVALID_ITEMS",
        hint: "Envie items[] no body."
      });
    }

    // normaliza items no formato que o Mercado Pago espera
    const items = itemsIn.map((it) => ({
      id: it.id || it.sku || null,
      title: it.title || it.name || "Item",
      quantity: Math.max(1, parseInt(it.quantity || 1, 10)),
      unit_price: safeNumber(it.unit_price ?? it.price ?? 0, 0)
    }));

    const subtotal = items.reduce(
      (acc, it) => acc + safeNumber(it.unit_price, 0) * safeNumber(it.quantity, 1),
      0
    );

    const shippingCost = safeNumber(body?.totals?.shipping ?? body?.shipping?.cost ?? 0, 0);
    const discount = safeNumber(body?.totals?.discount ?? 0, 0);
    const total = Math.max(0, subtotal + shippingCost - discount);

    // 1) cria ordem local (persistida no store)
    const order = await createOrder({
      userId: body.userId || null,
      items: body.items || [],
      totals: {
        subtotal,
        shipping: shippingCost,
        discount,
        total
      },
      shipping: body.shipping || {}
    });

    // 2) marca status aguardando pagamento
    await updateOrderStatus(order.id, ORDER_STATUS.AGUARDANDO_PAGAMENTO, {
      note: "Aguardando pagamento (preference Mercado Pago)",
      paymentStatus: "PENDING"
    });

    // 3) cria preference no Mercado Pago
    const webhookUrl = `${baseUrl}/api/v1/payment/webhook`; // você vai apontar o webhook do MP pra cá
    const successUrl = `${baseUrl}/buscar.html?pay=success&orderId=${encodeURIComponent(order.id)}`;
    const failureUrl = `${baseUrl}/buscar.html?pay=failure&orderId=${encodeURIComponent(order.id)}`;
    const pendingUrl = `${baseUrl}/buscar.html?pay=pending&orderId=${encodeURIComponent(order.id)}`;

    const preferencePayload = {
      items,
      notification_url: webhookUrl,
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl
      },
      auto_return: "approved",
      external_reference: order.id,
      metadata: {
        orderId: order.id,
        userId: order.userId
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

    const mpJson = await mpResp.json().catch(() => null);

    if (!mpResp.ok) {
      await addOrderEvent(order.id, {
        note: "Falha ao criar preference no Mercado Pago",
        meta: { mpStatus: mpResp.status, mpJson }
      });

      return json(res, 502, {
        ok: false,
        error: "MERCADOPAGO_PREFERENCE_FAILED",
        status: mpResp.status,
        details: mpJson
      });
    }

    // 4) salva dados do pagamento na ordem
    await attachPayment(order.id, {
      provider: "mercadopago",
      status: "PENDING",
      externalId: mpJson?.id || null,
      method: "checkout_preference"
    });

    await addOrderEvent(order.id, {
      note: "Preference criada no Mercado Pago",
      meta: { preferenceId: mpJson?.id || null }
    });

    return json(res, 200, {
      ok: true,
      orderId: order.id,
      provider: "mercadopago",
      preferenceId: mpJson?.id || null,
      init_point: mpJson?.init_point || null,
      sandbox_init_point: mpJson?.sandbox_init_point || null
    });
  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: "PAYMENT_CREATE_ERROR",
      message: err?.message || String(err)
    });
  }
}

/**
 * Controller: webhook do Mercado Pago
 * Rota esperada: POST /api/v1/payment/webhook
 *
 * Observação:
 * - Mercado Pago manda diferentes tipos de payload
 * - Aqui a gente faz o básico: tenta capturar orderId (external_reference/metadata)
 * - Se quiser validar assinatura: usar MP_WEBHOOK_SECRET (HMAC)
 */
export async function paymentWebhookController(req, res) {
  try {
    // (opcional) valida assinatura se você configurar um secret seu
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (secret) {
      const sig = req.get("x-signature") || req.get("X-Signature") || "";
      const raw = JSON.stringify(req.body || {});
      const expected = signHmac(secret, raw);

      // se não bater, não derruba servidor; só nega webhook
      if (!sig || sig !== expected) {
        return json(res, 401, { ok: false, error: "WEBHOOK_INVALID_SIGNATURE" });
      }
    }

    const payload = req.body || {};

    // tenta achar o orderId onde o MP costuma carregar
    const orderId =
      payload?.data?.id && payload?.external_reference
        ? payload.external_reference
        : payload?.external_reference ||
          payload?.metadata?.orderId ||
          payload?.metadata?.order_id ||
          payload?.orderId ||
          payload?.order_id ||
          null;

    if (!orderId) {
      // webhook “genérico” do MP as vezes vem sem referência (depende do tipo)
      return json(res, 200, { ok: true, received: true, note: "no-order-id" });
    }

    const order = await findOrderById(orderId);
    if (!order) {
      return json(res, 404, { ok: false, error: "ORDER_NOT_FOUND", orderId });
    }

    // status do pagamento pode vir em vários formatos; aqui mantemos simples
    const mpStatus =
      payload?.status ||
      payload?.data?.status ||
      payload?.payment_status ||
      payload?.action ||
      null;

    await addOrderEvent(orderId, {
      note: "Webhook Mercado Pago recebido",
      meta: { mpStatus, payload }
    });

    // regra simples: se aparecer "approved", marca como PAGO
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