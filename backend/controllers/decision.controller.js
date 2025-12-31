// backend/controllers/decision.controller.js

// armazenamento em memória (temporário)
const decisions = new Map();

function now() {
  return Date.now();
}

function computeOffers({ basePriceBRL, region }) {
  const national = {
    mode: "national",
    supplier: "Nexus National",
    origin: "BR",
    price: Number((basePriceBRL * 1.12).toFixed(2)),
    shipping: region === "BR" ? 15 : 45,
    deliveryDays: region === "BR" ? 5 : 12,
  };

  const international = {
    mode: "international",
    supplier: "Nexus International",
    origin: "INT",
    price: Number((basePriceBRL * 0.98).toFixed(2)),
    shipping: region === "AF" ? 65 : 55,
    deliveryDays: region === "AF" ? 18 : 15,
  };

  return [national, international].map(o => ({
    ...o,
    totalPrice: Number((o.price + o.shipping).toFixed(2)),
  }));
}

function decideBestOffer(offers, region, pref = "best") {
  if (pref === "national") {
    return offers.find(o => o.origin === "BR") || null;
  }

  if (pref === "cheapest") {
    return offers.slice().sort((a, b) => a.totalPrice - b.totalPrice)[0];
  }

  let best = null;
  let bestScore = -Infinity;

  for (const o of offers) {
    let score = 0;
    score += (5000 - o.totalPrice);
    if (region === "BR" && o.origin === "BR") score += 400;
    if (region === "AF" && o.origin !== "BR") score += 250;
    score += (30 - o.deliveryDays) * 10;

    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }

  return best;
}

export const decisionController = {
  // GET /api/decision/recommend
  recommend: async (req, res) => {
    try {
      const handle = String(req.query.handle || "").trim();
      const region = String(req.query.region || "BR").toUpperCase();
      const pref = String(req.query.pref || "best");
      const basePrice = Number(req.query.basePrice || 0);

      if (!handle) return res.status(400).json({ ok: false, error: "MISSING_HANDLE" });
      if (!basePrice) return res.status(400).json({ ok: false, error: "MISSING_BASE_PRICE" });

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

      decisions.set(handle, payload);

      return res.json({ ok: true, ...payload });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  },

  // GET /api/decision/get
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
      items: Array.from(decisions.values()),
    });
  },
};