// backend/controllers/decision.controller.js
// ETAPA A — Fornecedor REAL (Syncee / CJ) via Shopify
// - Preço REAL vem da Shopify
// - Fornecedor/origem definidos por regra operacional
// - Sem Redis, sem dependências externas

// ===============================
// STORAGE EM MEMÓRIA (TEMPORÁRIO)
// ===============================
const decisions = new Map();
const now = () => Date.now();

// ===============================
// REGRAS DE ORIGEM / FORNECEDOR
// ===============================
// Fonte confiável:
// - product.vendor (Shopify)
// - handle / categoria (heurística segura)
//
// Ajuste essas regras conforme sua operação crescer.

function inferOriginAndSupplier({ vendor, handle }) {
  const v = (vendor || "").toLowerCase();
  const h = (handle || "").toLowerCase();

  // Nacional (BR)
  if (v.includes("brasil") || v.includes("nacional") || h.includes("br-")) {
    return { supplier: "Syncee (BR)", origin: "BR" };
  }

  // Europa
  if (v.includes("eu") || v.includes("europe")) {
    return { supplier: "Syncee (EU)", origin: "EU" };
  }

  // China / Internacional
  if (v.includes("cj") || v.includes("china") || v.includes("aliexpress")) {
    return { supplier: "CJ Dropshipping", origin: "INT" };
  }

  // Fallback seguro
  return { supplier: "Internacional", origin: "INT" };
}

// ===============================
// CONSTRUIR OFERTAS REAIS
// ===============================
// basePrice = preço real da Shopify
// region = região do cliente (BR, AF, EU, US)

function buildOffersFromShopify({ basePrice, vendor, handle, region }) {
  const offers = [];

  const inferred = inferOriginAndSupplier({ vendor, handle });

  // 🇧🇷 OFERTA NACIONAL (quando aplicável)
  if (inferred.origin === "BR") {
    offers.push({
      supplier: inferred.supplier,
      origin: "BR",
      price: Number((basePrice * 1.06).toFixed(2)), // margem operacional menor
      shipping: region === "BR" ? 15 : 45,
      deliveryDays: region === "BR" ? 5 : 12,
    });
  }

  // 🌍 OFERTA INTERNACIONAL (sempre existe)
  offers.push({
    supplier: inferred.origin === "EU" ? "Syncee (EU)" : "CJ Dropshipping",
    origin: inferred.origin === "EU" ? "EU" : "INT",
    price: Number((basePrice * 0.96).toFixed(2)), // custo menor
    shipping: region === "AF" ? 65 : 55,
    deliveryDays: region === "AF" ? 20 : 15,
  });

  // totalPrice
  return offers.map(o => ({
    ...o,
    totalPrice: Number((o.price + o.shipping).toFixed(2)),
  }));
}

// ===============================
// CÉREBRO DE DECISÃO
// ===============================
function decideBestOffer(offers, region, pref = "best") {
  if (!offers || !offers.length) return null;

  if (pref === "national") {
    return offers.find(o => o.origin === "BR") || null;
  }

  if (pref === "cheapest") {
    return offers.slice().sort((a, b) => a.totalPrice - b.totalPrice)[0];
  }

  // best = custo-benefício
  let best = null;
  let bestScore = -Infinity;

  for (const o of offers) {
    let score = 0;

    // preço pesa
    score += (5000 - o.totalPrice);

    // localidade
    if (region === "BR" && o.origin === "BR") score += 400;
    if (region === "AF" && o.origin !== "BR") score += 250;
    if (region === "EU" && o.origin === "EU") score += 300;

    // prazo
    score += (30 - o.deliveryDays) * 10;

    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }

  return best;
}

// ===============================
// CONTROLLER
// ===============================
export const decisionController = {
  // GET /api/decision/recommend
  // params:
  // - handle
  // - vendor
  // - region (BR, AF, EU, US)
  // - pref (best | national | cheapest)
  // - basePrice (preço real da Shopify)
  recommend: async (req, res) => {
    try {
      const handle = String(req.query.handle || "").trim();
      const vendor = String(req.query.vendor || "").trim();
      const region = String(req.query.region || "BR").toUpperCase();
      const pref = String(req.query.pref || "best");
      const basePrice = Number(req.query.basePrice || 0);

      if (!handle) return res.status(400).json({ ok: false, error: "MISSING_HANDLE" });
      if (!Number.isFinite(basePrice) || basePrice <= 0) {
        return res.status(400).json({ ok: false, error: "INVALID_BASE_PRICE" });
      }

      const offers = buildOffersFromShopify({
        basePrice,
        vendor,
        handle,
        region,
      });

      const best = decideBestOffer(offers, region, pref);

      const payload = {
        handle,
        vendor,
        region,
        pref,
        basePrice,
        offers,
        best,
        updatedAt: now(),
      };

      decisions.set(handle, payload);
      return res.json({ ok: true, ...payload });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  },

  // GET /api/decision/get?handle=...
  get: async (req, res) => {
    const handle = String(req.query.handle || "").trim();
    if (!handle) return res.status(400).json({ ok: false, error: "MISSING_HANDLE" });

    return res.json({ ok: true, decision: decisions.get(handle) || null });
  },

  // GET /api/decision/list
  list: async (_req, res) => {
    return res.json({
      ok: true,
      total: decisions.size,
      items: Array.from(decisions.values()).sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
      ),
    });
  },
};