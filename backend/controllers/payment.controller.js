// backend/controllers/payment.controller.js
import crypto from "crypto";

import {
  createOrder,
  attachPayment,
  updateOrderStatus,
  addOrderEvent,
  ORDER_STATUS
} from "../services/orders.service.js";

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function getBackendBaseUrl(req) {
  const proto =
    (req.headers["x-forwarded-proto"] || "").split(",")[0]?.trim() ||
    req.protocol ||
    "https";

  const host =
    (req.headers["x-forwarded-host"] || "").split(",")[0]?.trim() ||
    req.get("host");

  return `${proto}://${host}`;
}

function getUserFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString("utf8")
    );
    return payload || null;
  } catch {
    return null;
  }
}

function safeNumber(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * POST /api/v1/payment/create
 * Body (MVP):
 * {
 *   "items": [{ "id":"plan_core", "title":"Plano Core", "quantity": 1, "unit_price": 19.90 }],
 *   "amountCents": 1990
 * }
 */
export async function createPaymentController(req, res) {
  try {
    const MP_ACCESS_TOKEN =
      process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!MP_ACCESS_TOKEN) {
      return json(res, 500, {
        ok: false,
        error: "MERCADOPAGO_TOKEN_MISSING",
        hint: "Crie a env MP_ACCESS_TOKEN (ou MERCADOPAGO_ACCESS_TOKEN) no Render."
      });
    }

    const user = getUserFromToken(req);
    if (!user?.email) {
      return json(res, 401, { ok: false, error: "INVALID_OR_EXPIRED_TOKEN" });
    }

    const body = req.body || {};
    const itemsIn = Array.isArray(body.items) ? body.items : [];
    const amountCents = safeNumber(body.amountCents, 0);
    const currency = (body.currency || "BRL").toUpperCase();

    if (!itemsIn.length) {
      return json(res, 400, {
        ok: false,
        error: "INVALID_ITEMS",
        hint: "Envie items[] no body."
      });
    }

    if (amountCents <= 0) {
      return json(res, 400, {
        ok: false,
        error: "INVALID_AMOUNT",
        hint: "Envie amountCents > 0."
      });
    }

    // Normaliza para o Mercado Pago (unit_price em reais)
    const mpItems = itemsIn.map((it) => ({
      id: it.id || it.sku || null,
      title: it.title || it.name || "Item",
      quantity: Math.max(1, parseInt(it.quantity || 1, 10)),
      unit_price: safeNumber(it.unit_price, 0)
    }));

    const backendBase = getBackendBaseUrl(req);
    const frontendBase = (process.env.FRONTEND_URL || "https://nexustore.store").replace(/\/$/, "");

    // 1) cria ordem local (Postgres / store)
    const { orderId } = await createOrder({
      userEmail: user.email,
      userCpf: user.cpf || null,
      items: itemsIn,
      amountCents,
      currency
    });

    // 2) marca status aguardando pagamento
    await updateOrderStatus(orderId, ORDER_STATUS.AGUARDANDO_PAGAMENTO, {
      note: "Aguardando pagamento (Mercado Pago)",
      paymentStatus: "PENDING"
    });

    // 3) registra payment “pendente” na ordem
    await attachPayment(orderId, {
      provider: "mercadopago",
      status: "PENDING",
      method: "checkout_preference",
      externalId: null
    });

    await addOrderEvent(orderId, {
      note: "Iniciando pagamento Mercado Pago (criando preference)",
      meta: { amountCents, currency }
    });

    // 4) cria preference no Mercado Pago
    const webhookUrl = `${backendBase}/api/v1/payment/webhook/mercadopago`;

    const successUrl = `${frontendBase}/buscar.html?pay=success&orderId=${encodeURIComponent(orderId)}`;
    const failureUrl = `${frontendBase}/buscar.html?pay=failure&orderId=${encodeURIComponent(orderId)}`;
    const pendingUrl = `${frontendBase}/buscar.html?pay=pending&orderId=${encodeURIComponent(orderId)}`;

    const preferencePayload = {
      items: mpItems,
      notification_url: webhookUrl,
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl
      },
      auto_return: "approved",
      external_reference: orderId,
      metadata: {
        orderId,
        userEmail: user.email
      }
    };

    const mpResp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID()
      },
      body: JSON.stringify(preferencePayload)
    });

    const mpJson = await mpResp.json().catch(() => null);

    if (!mpResp.ok) {
      await addOrderEvent(orderId, {
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

    // 5) atualiza externalId
    await attachPayment(orderId, {
      provider: "mercadopago",
      status: "PENDING",
      method: "checkout_preference",
      externalId: mpJson?.id || null
    });

    await addOrderEvent(orderId, {
      note: "Preference criada no Mercado Pago",
      meta: { preferenceId: mpJson?.id || null }
    });

    return json(res, 200, {
      ok: true,
      orderId,
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