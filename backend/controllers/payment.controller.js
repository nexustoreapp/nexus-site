// backend/controllers/payment.controller.js
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mercadopago from "mercadopago";
import { createOrder, attachPayment } from "../services/orders.service.js";

function pickBearerToken(req) {
  const h = req.headers?.authorization || "";
  const parts = h.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  return null;
}

function safeJson(res, status, payload) {
  return res.status(status).json(payload);
}

function inferPlanKeyFromItem(item) {
  const id = String(item?.id || "").toLowerCase();
  const title = String(item?.title || "").toLowerCase();

  if (id.includes("core_test") || id.includes("coretest") || title.includes("teste")) return "core_test";

  if (id.includes("omega") || title.includes("omega")) return "omega";
  if (id.includes("hyper") || title.includes("hyper")) return "hyper";
  if (id.includes("core") || title.includes("core")) return "core";

  return "free";
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeCpf(cpf) {
  return String(cpf || "").replace(/\D/g, "");
}

function makeOrderId() {
  return `order_${crypto.randomBytes(10).toString("hex")}`;
}

function getBackendPublicUrl(req) {
  const env =
    process.env.BACKEND_PUBLIC_URL ||
    process.env.PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "";

  if (env) return env.replace(/\/+$/, "");

  const proto = (req.headers["x-forwarded-proto"] || "https").toString();
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString();
  return `${proto}://${host}`.replace(/\/+$/, "");
}

export async function createPayment(req, res) {
  try {

    const MP_ACCESS_TOKEN =
      process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!MP_ACCESS_TOKEN) {
      return safeJson(res, 500, { ok: false, error: "MP_ACCESS_TOKEN_NOT_SET" });
    }

    const token = pickBearerToken(req);
    if (!token) {
      return safeJson(res, 401, { ok: false, error: "UNAUTHORIZED" });
    }

    let decoded = null;
    try {
      const secret = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || "";
      decoded = secret ? jwt.verify(token, secret) : jwt.decode(token);
    } catch {
      decoded = jwt.decode(token);
    }

    const userEmail = normalizeEmail(decoded?.email);
    const userCpf = normalizeCpf(decoded?.cpf);

    if (!userEmail) {
      return safeJson(res, 400, { ok: false, error: "TOKEN_WITHOUT_EMAIL" });
    }

    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];

    if (!items.length) {
      return safeJson(res, 400, { ok: false, error: "NO_ITEMS" });
    }

    const first = items[0] || {};
    const planKey = inferPlanKeyFromItem(first);

    let amountCents = Number(body.amountCents || 0);

    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return safeJson(res, 400, { ok: false, error: "INVALID_AMOUNT" });
    }

    /* =====================================
       MODO TESTE DE PAGAMENTO
    ===================================== */

    const TEST_MODE = process.env.PAYMENT_TEST_MODE === "true";

    if (TEST_MODE) {
      amountCents = 1;
    }

    const order = await createOrder({
      orderId: makeOrderId(),
      userEmail,
      items: items.map((it) => ({
        sku: String(it.id || ""),
        title: String(it.title || ""),
        price: TEST_MODE ? 0.01 : Number(it.unit_price || 0),
        qty: Number(it.quantity || 1)
      })),
      totals: { total: amountCents / 100 },
      metadata: {
        planKey,
        userCpf: userCpf || null
      }
    });

    const orderId = order?.id;
    if (!orderId) {
      return safeJson(res, 500, { ok: false, error: "ORDER_ID_MISSING" });
    }

    mercadopago.configure({ access_token: MP_ACCESS_TOKEN });

    const backendUrl = getBackendPublicUrl(req);
    const notificationUrl = `${backendUrl}/api/v1/payment/webhook/mercadopago`;

    const FRONT = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");

    const preference = {
      items: [
        {
          id: String(first.id || "item"),
          title: String(first.title || "Plano"),
          quantity: Number(first.quantity || 1),
          unit_price: TEST_MODE ? 0.01 : Number(first.unit_price || (amountCents / 100))
        }
      ],

      external_reference: orderId,

      metadata: {
        orderId,
        userEmail,
        userCpf: userCpf || null,
        planKey
      },

      notification_url: notificationUrl,

      back_urls: {
        success: FRONT ? `${FRONT}/pagamento-confirmado.html` : undefined,
        pending: FRONT ? `${FRONT}/pagamento-pendente.html` : undefined,
        failure: FRONT ? `${FRONT}/pagamento-recusado.html` : undefined
      },
      auto_return: "approved"
    };

    const mpResp = await mercadopago.preferences.create(preference);

    try {
      await attachPayment(orderId, {
        provider: "mercadopago",
        preferenceId: mpResp?.body?.id || null,
        status: "pending",
        method: "pix",
        amount: amountCents / 100,
        raw: mpResp?.body || null
      });
    } catch {}

    return safeJson(res, 200, {
      ok: true,
      orderId,
      planKey,
      init_point: mpResp?.body?.init_point || null,
      sandbox_init_point: mpResp?.body?.sandbox_init_point || null
    });

  } catch (err) {

    console.error("createPayment error:", err);

    return safeJson(res, 500, { ok: false, error: "PAYMENT_CREATE_FAILED" });

  }
}