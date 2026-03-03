// backend/controllers/payment.controller.js

import fetch from "node-fetch";
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

/*
=====================================
CONTROLLER PRINCIPAL
POST /api/v1/payment/create
=====================================
*/

export async function createPayment(req, res) {
  try {

    const MP_ACCESS_TOKEN =
      process.env.MP_ACCESS_TOKEN ||
      process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!MP_ACCESS_TOKEN) {
      return json(res, 500, {
        ok: false,
        error: "MP_TOKEN_MISSING"
      });
    }

    const user = getUserFromToken(req);

    if (!user?.email) {
      return json(res, 401, {
        ok: false,
        error: "INVALID_TOKEN"
      });
    }

    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];
    const amountCents = safeNumber(body.amountCents, 0);
    const currency = (body.currency || "BRL").toUpperCase();

    if (!items.length) {
      return json(res, 400, {
        ok: false,
        error: "ITEMS_REQUIRED"
      });
    }

    if (amountCents <= 0) {
      return json(res, 400, {
        ok: false,
        error: "INVALID_AMOUNT"
      });
    }

    const amount = amountCents / 100;

    /*
    ==========================
    INICIO_PLANO_TESTE
    ==========================
    */

    if (amount < 0.01) {
      return json(res, 400, {
        ok: false,
        error: "VALOR_INVALIDO_TESTE"
      });
    }

    /*
    ==========================
    FIM_PLANO_TESTE
    ==========================
    */

    const backendBase = getBackendBaseUrl(req);
    const frontendBase =
      (process.env.FRONTEND_URL || "https://nexustore.store").replace(/\/$/, "");

    /*
    ==========================
    CRIA ORDEM
    ==========================
    */

    const { orderId } = await createOrder({
      userEmail: user.email,
      items,
      amountCents,
      currency
    });

    await updateOrderStatus(orderId, ORDER_STATUS.AGUARDANDO_PAGAMENTO, {
      paymentStatus: "PENDING"
    });

    await attachPayment(orderId, {
      provider: "mercadopago",
      status: "PENDING",
      method: "checkout_preference",
      externalId: null
    });

    await addOrderEvent(orderId, {
      note: "Criando pagamento Mercado Pago",
      meta: { amountCents }
    });

    /*
    ==========================
    PREPARA ITENS
    ==========================
    */

    const mpItems = items.map((i) => ({
      id: i.id,
      title: i.title,
      quantity: i.quantity || 1,
      unit_price: safeNumber(i.unit_price)
    }));

    /*
    ==========================
    URLS
    ==========================
    */

    const webhookUrl =
      `${backendBase}/api/v1/payment/webhook/mercadopago`;

    const successUrl =
      `${frontendBase}/buscar.html?pay=success&orderId=${orderId}`;

    const failureUrl =
      `${frontendBase}/buscar.html?pay=failure&orderId=${orderId}`;

    const pendingUrl =
      `${frontendBase}/buscar.html?pay=pending&orderId=${orderId}`;

    /*
    ==========================
    PAYLOAD MP
    ==========================
    */

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

    /*
    ==========================
    CHAMA MERCADO PAGO
    ==========================
    */

    const mpResp = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": crypto.randomUUID()
        },
        body: JSON.stringify(preferencePayload)
      }
    );

    const mpJson = await mpResp.json().catch(() => null);

    if (!mpResp.ok) {

      console.error("MP ERROR", mpJson);

      return json(res, 502, {
        ok: false,
        error: "MP_CREATE_FAILED",
        details: mpJson
      });
    }

    /*
    ==========================
    SALVA ID DO MP
    ==========================
    */

    await attachPayment(orderId, {
      provider: "mercadopago",
      status: "PENDING",
      method: "checkout_preference",
      externalId: mpJson?.id || null
    });

    await addOrderEvent(orderId, {
      note: "Preference criada",
      meta: { preferenceId: mpJson?.id }
    });

    /*
    ==========================
    RETORNO
    ==========================
    */

    return json(res, 200, {
      ok: true,
      orderId,
      provider: "mercadopago",
      preferenceId: mpJson?.id,
      init_point: mpJson?.init_point,
      sandbox_init_point: mpJson?.sandbox_init_point
    });

  } catch (err) {

    console.error("PAYMENT ERROR:", err);

    return json(res, 500, {
      ok: false,
      error: "PAYMENT_CREATE_ERROR",
      message: err?.message
    });

  }
}