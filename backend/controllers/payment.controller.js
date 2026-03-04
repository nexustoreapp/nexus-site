// backend/controllers/payment.controller.js
import dotenv from "dotenv";
dotenv.config();

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function getBaseUrl(req) {
  // Melhor: setar PUBLIC_URL no Render com seu domínio do backend
  // Ex: https://nexus-site-oufm.onrender.com
  const envUrl = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL;
  if (envUrl) return String(envUrl).replace(/\/+$/, "");

  // fallback pelo request
  const proto = (req.headers["x-forwarded-proto"] || "https").toString();
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`.replace(/\/+$/, "");
}

function getFrontUrl() {
  // Se quiser, pode setar FRONTEND_URL (ex: https://nexustore.store)
  const u = process.env.FRONTEND_URL || "";
  return u ? String(u).replace(/\/+$/, "") : "";
}

function extractPlanKey(reqBody) {
  // Seu checkout manda items[0].id tipo "plan_core_test"
  // Vamos converter isso em "core_test", "core", "hyper", "omega"
  const itemId = reqBody?.items?.[0]?.id || reqBody?.items?.[0]?.sku || "";
  const raw = String(itemId).toLowerCase().trim();

  // aceita "plan_core_test", "plan_core", etc
  if (raw.includes("core_test")) return "core_test";
  if (raw.includes("core")) return "core";
  if (raw.includes("hyper")) return "hyper";
  if (raw.includes("omega")) return "omega";
  return "core";
}

function extractUserEmail(req) {
  // Se você tem auth middleware que injeta req.user, beleza.
  // Se não tiver, o frontend pode mandar userEmail (opcional).
  const fromUser = req.user?.email || req.auth?.email;
  const fromBody = req.body?.userEmail;

  const email = (fromUser || fromBody || "").toString().trim().toLowerCase();
  return email;
}

export async function createPayment(req, res) {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ ok: false, error: "MP_ACCESS_TOKEN_MISSING" });
    }

    const userEmail = extractUserEmail(req);
    if (!userEmail) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED_NO_EMAIL" });
    }

    const planKey = extractPlanKey(req.body);

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const item0 = items[0] || {};
    const title = item0.title || `Plano ${planKey}`;
    const unitPrice = Number(item0.unit_price || 0);

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_PRICE" });
    }

    const baseUrl = getBaseUrl(req);

    const frontUrl = getFrontUrl();
    const successUrl = frontUrl ? `${frontUrl}/pagamento-confirmado.html` : "https://example.com/pagamento-confirmado.html";
    const pendingUrl = frontUrl ? `${frontUrl}/pagamento-pendente.html` : "https://example.com/pagamento-pendente.html";
    const failureUrl = frontUrl ? `${frontUrl}/pagamento-recusado.html` : "https://example.com/pagamento-recusado.html";

    const externalReference = JSON.stringify({
      email: userEmail,
      plan: planKey
    });

    const preference = {
      items: [
        {
          title,
          quantity: 1,
          unit_price: unitPrice,
          currency_id: "BRL"
        }
      ],
      external_reference: externalReference,
      metadata: {
        email: userEmail,
        plan: planKey
      },
      notification_url: `${baseUrl}/api/payment/webhook/mercadopago`,
      back_urls: {
        success: successUrl,
        pending: pendingUrl,
        failure: failureUrl
      },
      auto_return: "approved"
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(preference)
    });

    const mpData = await mpRes.json().catch(() => null);

    if (!mpRes.ok || !mpData?.id) {
      return res.status(400).json({
        ok: false,
        error: "MP_CREATE_PREFERENCE_FAILED",
        details: mpData || null
      });
    }

    return res.json({
      ok: true,
      preferenceId: mpData.id,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      plan: planKey,
      email: userEmail
    });
  } catch (err) {
    console.error("createPayment error:", err);
    return res.status(500).json({ ok: false, error: "PAYMENT_CREATE_ERROR" });
  }
}