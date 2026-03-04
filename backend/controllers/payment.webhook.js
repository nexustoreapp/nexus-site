// backend/controllers/payment.webhook.js
import dotenv from "dotenv";
dotenv.config();

import { updateUserPlanByEmail } from "../services/users.service.js";

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function pickPaymentId(req) {
  // Mercado Pago pode mandar:
  // body.data.id (novo)
  // query["data.id"] (alguns cenários)
  // body.id (fallback)
  const fromBody = req.body?.data?.id || req.body?.id;
  const fromQuery = req.query?.["data.id"] || req.query?.id;

  const id = fromBody || fromQuery;
  return id ? String(id).trim() : "";
}

async function fetchPayment(paymentId) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN_MISSING");

  const url = `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`;
  const r = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const data = await r.json().catch(() => null);
  if (!r.ok || !data?.id) {
    const msg = JSON.stringify(data || {});
    throw new Error(`MP_FETCH_PAYMENT_FAILED: ${r.status} ${msg}`);
  }
  return data;
}

function extractPlanAndEmail(payment) {
  const meta = payment?.metadata || {};
  const planFromMeta = meta.plan ? String(meta.plan) : "";
  const emailFromMeta = meta.email ? String(meta.email).toLowerCase().trim() : "";

  if (planFromMeta && emailFromMeta) {
    return { plan: planFromMeta, email: emailFromMeta };
  }

  const ext = payment?.external_reference ? String(payment.external_reference) : "";
  const parsed = safeJsonParse(ext);

  const plan = (parsed?.plan || planFromMeta || "").toString().trim();
  const email = (parsed?.email || emailFromMeta || "").toString().toLowerCase().trim();

  return { plan, email };
}

function normalizePlan(plan) {
  const p = String(plan || "").toLowerCase().trim();
  if (p === "coretest" || p === "core_teste" || p === "core-teste") return "core_test";
  return p;
}

async function processPaymentById(paymentId) {
  const payment = await fetchPayment(paymentId);

  const status = String(payment?.status || "").toLowerCase();
  const { plan, email } = extractPlanAndEmail(payment);

  const normPlan = normalizePlan(plan);

  return { payment, status, plan: normPlan, email };
}

export async function mercadopagoWebhook(req, res) {
  try {
    const paymentId = pickPaymentId(req);

    console.log("📩 MP webhook recebido:", {
      path: req.originalUrl,
      paymentId: paymentId || null,
      bodyKeys: Object.keys(req.body || {})
    });

    if (!paymentId) {
      // MP às vezes manda eventos que não são payment data
      return res.status(200).json({ ok: true, ignored: true });
    }

    const { status, plan, email } = await processPaymentById(paymentId);

    console.log("💳 MP payment:", { paymentId, status, plan, email });

    if (status === "approved") {
      if (!email || !plan) {
        console.log("⚠️ approved mas sem email/plan no payment (metadata/external_reference)");
        return res.status(200).json({ ok: true, approved: true, updated: false });
      }

      await updateUserPlanByEmail(email, plan);

      console.log("✅ Plano ativado:", { email, plan, paymentId });
      return res.status(200).json({ ok: true, approved: true, updated: true });
    }

    // pending / rejected / cancelled etc
    return res.status(200).json({ ok: true, approved: false, status });
  } catch (err) {
    console.error("❌ Erro webhook:", err);
    return res.status(500).json({ ok: false, error: "webhook_error" });
  }
}

/* =====================================================
REPROCESSAMENTO ADMIN (SEM PAGAR DE NOVO)
POST /payment/admin/reprocess/:paymentId
Header: X-Admin-Key = (env ADMIN_KEY)
===================================================== */
export async function reprocessPaymentAdmin(req, res) {
  try {
    const adminKey = process.env.ADMIN_KEY || "";
    const headerKey = (req.headers["x-admin-key"] || "").toString();

    if (!adminKey || headerKey !== adminKey) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED_ADMIN" });
    }

    const paymentId = String(req.params.paymentId || "").trim();
    if (!paymentId) return res.status(400).json({ ok: false, error: "MISSING_PAYMENT_ID" });

    const { status, plan, email } = await processPaymentById(paymentId);

    if (status !== "approved") {
      return res.json({ ok: true, updated: false, status, plan, email });
    }

    if (!email || !plan) {
      return res.json({ ok: true, updated: false, status, reason: "missing_email_or_plan" });
    }

    await updateUserPlanByEmail(email, plan);
    return res.json({ ok: true, updated: true, status, plan, email });
  } catch (err) {
    console.error("reprocessPaymentAdmin error:", err);
    return res.status(500).json({ ok: false, error: "REPROCESS_ERROR" });
  }
}