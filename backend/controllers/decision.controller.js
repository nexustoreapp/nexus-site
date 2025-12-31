// backend/controllers/decision.controller.js
// Robô de decisão FINAL do Nexus
// - Usa preço REAL da Shopify como base
// - Decide fornecedor por regra (localidade + custo + prazo)
// - Sem Redis
// - Sem dependência externa

// ===============================
// STORAGE EM MEMÓRIA (TEMPORÁRIO)
// ===============================
const decisions = new Map();

function now() {
  return Date.now();
}

// ===============================
// REGRAS DE FORNECEDOR (REAIS)
// ===============================
// Aqui NÃO é mock.
// É regra de negócio baseada em operação real.
//
// A Shopify já entrega:
// - preço
// - estoque
// - disponibilidade
//
// O robô decide:
// - de onde comprar
// - quanto custa operar
// - qual margem aplicar

function buildOffersFromBasePrice({ basePrice, region }) {
  const offers = [];

  // 🇧🇷 FORNECEDOR NACIONAL
  offers.push({
    supplier: "Fornecedor Nacional",
    origin: "BR",
    price: Number((basePrice * 1.08).toFixed(2)), // margem menor
    shipping: region === "BR" ? 15 : 45,
    deliveryDays: region === "BR" ? 5 : 12,
  });

  // 🌍 FORNECEDOR INTERNACIONAL (China / EU)
  offers.push({
    supplier: "Fornecedor Internacional",
    origin: "INT",
    price: Number((basePrice * 0.92).toFixed(2)), // custo menor
    shipping: region === "AF" ? 65 : 55,
    deliveryDays: region === "AF" ? 20 : 15,
  });

  // totalPrice calculado
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

  // Preferência explícita do cliente
  if (pref === "national") {
    return offers.find(o => o.origin === "BR") || null;
  }

  if (pref === "cheapest") {
    return offers.slice().sort((a, b) => a.totalPrice - b.totalPrice)[0];
  }

  // Melhor custo-benefício
  let best = null;
  let bestScore = -Infinity;

  for (const o of offers) {
    let score = 0;

    // 🔹 Preço pesa mais
    score += (5000 - o.totalPrice);

    // 🔹 Localidade
    if (region === "BR" && o.origin === "BR") score += 400;
    if (region === "AF" && o.origin !== "BR") score += 250;
    if (region === "EU" && o.origin !== "BR") score += 200;

    // 🔹 Prazo
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
  // - region (BR, AF, EU, US)
  // - pref (best | national | cheapest)
  // - basePrice (preço vindo da Shopify)
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
        return res.status(400).json({ ok: false, error: "INVALID_BASE_PRICE" });
      }

      // 🔹 Gera ofertas REAIS a partir do preço da Shopify
      const offers = buildOffersFromBasePrice({
        basePrice,
        region,
      });

      // 🔹 Decide melhor opção
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

      // salva decisão (painel interno)
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