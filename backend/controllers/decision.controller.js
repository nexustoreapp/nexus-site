// backend/controllers/decision.controller.js
// Controller FINAL do robô de decisão Nexus
// - Sem Redis
// - Sem dependência externa
// - Decisão por preço + localidade + preferência do cliente

// ===============================
// STORAGE EM MEMÓRIA (TEMPORÁRIO)
// ===============================
const decisions = new Map();

function now() {
  return Date.now();
}

// ===============================
// FORNECEDORES (MÓDULOS SIMPLES)
// ===============================
// ⚠️ Esses módulos depois podem virar APIs reais.
// O formato é PADRÃO e não deve ser quebrado.

async function getSynceeOffer({ sku, region }) {
  return {
    supplier: "Syncee",
    origin: region === "BR" ? "BR" : "EU",
    price: 180,
    shipping: region === "BR" ? 20 : 35,
    deliveryDays: region === "BR" ? 6 : 10,
  };
}

async function getCJOffer({ sku, region }) {
  return {
    supplier: "CJ Dropshipping",
    origin: "CN",
    price: 160,
    shipping: region === "AF" ? 70 : 55,
    deliveryDays: region === "AF" ? 20 : 15,
  };
}

// ===============================
// COLETA DE OFERTAS
// ===============================
async function computeOffers({ sku, basePriceBRL, region }) {
  const offers = [];

  const syncee = await getSynceeOffer({ sku, region });
  if (syncee) {
    offers.push({
      ...syncee,
      totalPrice: Number((syncee.price + syncee.shipping).toFixed(2)),
    });
  }

  const cj = await getCJOffer({ sku, region });
  if (cj) {
    offers.push({
      ...cj,
      totalPrice: Number((cj.price + cj.shipping).toFixed(2)),
    });
  }

  return offers;
}

// ===============================
// DECISÃO (CÉREBRO)
// ===============================
function decideBestOffer(offers, region, pref = "best") {
  if (!offers || !offers.length) return null;

  // Preferência explícita
  if (pref === "national") {
    return offers.find(o => o.origin === "BR") || null;
  }

  if (pref === "cheapest") {
    return offers.slice().sort((a, b) => a.totalPrice - b.totalPrice)[0];
  }

  // Melhor equilíbrio (preço + localidade + prazo)
  let best = null;
  let bestScore = -Infinity;

  for (const o of offers) {
    let score = 0;

    // Preço pesa mais
    score += (5000 - o.totalPrice);

    // Localidade
    if (region === "BR" && o.origin === "BR") score += 400;
    if (region === "AF" && o.origin !== "BR") score += 250;
    if (region === "EU" && o.origin === "EU") score += 300;

    // Prazo
    score += (30 - o.deliveryDays) * 10;

    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }

  return best;
}

// ===============================
// CONTROLLER EXPORTADO
// ===============================
export const decisionController = {
  // GET /api/decision/recommend
  // params:
  // - handle
  // - region (BR, AF, EU, US)
  // - pref (best | national | cheapest)
  // - basePrice
  recommend: async (req, res) => {
    try {
      const handle = String(req.query.handle || "").trim();
      const region = String(req.query.region || "BR").toUpperCase();
      const pref = String(req.query.pref || "best");
      const basePrice = Number(req.query.basePrice || 0);

      if (!handle) {
        return res.status(400).json({ ok: false, error: "MISSING_HANDLE" });
      }

      if (!Number.isFinite(basePrice) || basePrice <= 0) {
        return res.status(400).json({ ok: false, error: "MISSING_BASE_PRICE" });
      }

      const offers = await computeOffers({
        sku: handle,
        basePriceBRL: basePrice,
        region,
      });

      const best = decideBestOffer(offers, region, pref);

      const payload = {
        handle,
        region,
        pref,
        basePrice,
        offers,
        best,
        updatedAt: now(),
      };

      // salva em memória (painel interno)
      decisions.set(handle, payload);

      return res.json({ ok: true, ...payload });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: err.message,
      });
    }
  },

  // GET /api/decision/get?handle=...
  get: async (req, res) => {
    const handle = String(req.query.handle || "").trim();
    if (!handle) {
      return res.status(400).json({ ok: false, error: "MISSING_HANDLE" });
    }

    return res.json({
      ok: true,
      decision: decisions.get(handle) || null,
    });
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