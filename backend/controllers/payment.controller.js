// backend/controllers/payment.controller.js
import fetch from "node-fetch";
import { attachProviderReference, createOrder } from "../services/orders.service.js";

function getUserFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;

  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8"));
    return payload || null;
  } catch {
    return null;
  }
}

/**
 * Mercado Pago Checkout Pro (Preference)
 * - cria pedido no DB
 * - cria preference no MP
 * - retorna init_point
 */
export async function createPaymentController(req, res) {
  const user = getUserFromToken(req);
  if (!user?.email) return res.status(401).json({ ok: false, error: "INVALID_OR_EXPIRED_TOKEN" });

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  const BASE_URL = process.env.PUBLIC_BASE_URL; // ex: https://nexus-site-oufm.onrender.com

  if (!MP_ACCESS_TOKEN || !BASE_URL) {
    return res.status(500).json({ ok: false, error: "PAYMENT_NOT_CONFIGURED" });
  }

  const { items } = req.body || {};
  const normalized = Array.isArray(items) ? items : [];

  // soma simples (centavos)
  const amountCents = normalized.reduce((acc, it) => {
    const q = Number(it.quantity || 1);
    const unit = Number(it.unitPriceCents || 0);
    return acc + q * unit;
  }, 0);

  const { orderId } = await createOrder({
    userEmail: user.email,
    userCpf: user.cpf || null,
    items: normalized,
    amountCents,
    currency: "BRL"
  });

  const mpItems = normalized.map((it) => ({
    id: it.productId || "item",
    title: it.title || "Produto Nexus",
    quantity: Number(it.quantity || 1),
    currency_id: "BRL",
    // MP usa unidade em reais
    unit_price: Number((Number(it.unitPriceCents || 0) / 100).toFixed(2))
  }));

  const preferencePayload = {
    items: mpItems,
    external_reference: orderId,
    notification_url: `${BASE_URL}/api/v1/payment/webhook/mercadopago`,
    back_urls: {
      success: `${BASE_URL}/produto.html`,
      failure: `${BASE_URL}/produto.html`,
      pending: `${BASE_URL}/produto.html`
    },
    auto_return: "approved"
  };

  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(preferencePayload)
  });

  const data = await r.json();

  if (!r.ok) {
    return res.status(502).json({ ok: false, error: "MP_PREFERENCE_FAILED", details: data });
  }

  // guarda referência do provider (id da preference)
  await attachProviderReference(orderId, { provider: "mercadopago", providerReference: data.id });

  return res.json({
    ok: true,
    orderId,
    provider: "mercadopago",
    preferenceId: data.id,
    init_point: data.init_point
  });
}