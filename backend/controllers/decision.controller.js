import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

function now() {
  return Date.now();
}

// Regras simples por enquanto (você pluga fornecedores reais depois)
function computeOffers({ basePriceBRL, region }) {
  // origem do produto (simples): BR ou INT
  // depois você troca isso por consultas reais aos fornecedores
  const national = {
    mode: "national",
    supplier: "Nexus National",
    origin: "BR",
    price: basePriceBRL * 1.12,           // exemplo: custo + margem pequena
    shipping: region === "BR" ? 15 : 45,   // exemplo
    deliveryDays: region === "BR" ? 5 : 12,
  };

  const international = {
    mode: "international",
    supplier: "Nexus International",
    origin: "INT",
    price: basePriceBRL * 0.98,           // exemplo: pode ser mais barato
    shipping: region === "AF" ? 65 : 55,
    deliveryDays: region === "AF" ? 18 : 15,
  };

  const offers = [national, international].map(o => ({
    ...o,
    totalPrice: Number((o.price + o.shipping).toFixed(2)),
    price: Number(o.price.toFixed(2)),
  }));

  return offers;
}

// Decide melhor oferta por preferência/localidade
function decideBestOffer(offers, region, pref = "best") {
  if (!offers?.length) return null;

  if (pref === "national") {
    return offers.find(o => o.origin === "BR") || null;
  }

  if (pref === "cheapest") {
    return offers.slice().sort((a, b) => a.totalPrice - b.totalPrice)[0];
  }

  // best: score (preço + localidade + prazo)
  let best = null;
  let bestScore = -Infinity;

  for (const o of offers) {
    let score = 0;

    // preço pesa
    score += (5000 - o.totalPrice);

    // localidade
    if (region === "BR" && o.origin === "BR") score += 400;
    if (region === "AF" && o.origin !== "BR") score += 250;

    // prazo
    score += (30 - o.deliveryDays) * 10;

    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }

  return best;
}

export const decisionController = {
  // GET /api/decision/recommend?handle=...&region=BR&pref=best
  recommend: async (req, res) => {
    try {
      const handle = String(req.query.handle || "").trim();
      const region = String(req.query.region || "BR").trim().toUpperCase(); // BR, AF, EU, US
      const pref = String(req.query.pref || "best").trim(); // best|national|cheapest
      const basePrice = Number(req.query.basePrice || 0);

      if (!handle) {
        return res.status(400).json({ ok: false, error: "MISSING_HANDLE" });
      }
      if (!Number.isFinite(basePrice) || basePrice <= 0) {
        return res.status(400).json({ ok: false, error: "MISSING_BASE_PRICE" });
      }

      const offers = computeOffers({ basePriceBRL: basePrice, region });
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

      // salva no redis (para painel/admin)
      await redis.set(`decision:${handle}`, payload);

      return res.json({ ok: true, ...payload });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  },

  // GET /api/decision/get?handle=...
  get: async (req, res) => {
    try {
      const handle = String(req.query.handle || "").trim();
      if (!handle) return res.status(400).json({ ok: false, error: "MISSING_HANDLE" });

      const data = await redis.get(`decision:${handle}`);
      return res.json({ ok: true, decision: data || null });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  },

  // GET /api/decision/list?limit=30
  list: async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 30), 100);
      const keys = await redis.keys("decision:*");
      const slice = keys.slice(0, limit);

      const items = [];
      for (const k of slice) {
        const v = await redis.get(k);
        if (v) items.push(v);
      }

      // mais recente primeiro
      items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      return res.json({ ok: true, total: items.length, items });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  },
};