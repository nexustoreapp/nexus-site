import fs from "fs";
import path from "path";

const rank = { free: 1, core: 2, hyper: 3, omega: 4 };

function loadCatalog() {
  const p = path.join(process.cwd(), "backend", "data", "catalogo.json");
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function norm(s = "") {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function pickPrice(p, plan) {
  // demonstração: preço exibido depende do plano
  const publicPrice = p.pricePublic ?? p.pricePremium ?? 0;
  const premiumPrice = p.pricePremium ?? p.pricePublic ?? 0;
  return plan === "free" ? publicPrice : premiumPrice;
}

export async function searchController(req, res) {
  try {
    const q = norm(req.query.q || "");
    const plan = norm(req.query.plan || "free") || "free";

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(60, Math.max(6, parseInt(req.query.limit || "24", 10)));

    // filtros
    const category = norm(req.query.category || "");
    const brand = norm(req.query.brand || "");
    const tier = norm(req.query.tier || "");
    const priceMin = req.query.priceMin !== undefined ? Number(req.query.priceMin) : null;
    const priceMax = req.query.priceMax !== undefined ? Number(req.query.priceMax) : null;

    const catalog = loadCatalog();

    // 1) plano: não mostrar acima do plano do usuário
    const allowed = catalog.filter(p => {
      const t = norm(p.tier || "free") || "free";
      return (rank[plan] || 1) >= (rank[t] || 1);
    });

    // 2) query
    const searched = q
      ? allowed.filter(p => {
          const hay = norm(
            [
              p.title,
              p.brand,
              p.category,
              p.subtitle,
              p.description,
              ...(p.tags || [])
            ].join(" ")
          );
          return hay.includes(q);
        })
      : allowed;

    // 3) aplica filtros
    const filtered = searched.filter(p => {
      const pCategory = norm(p.category || "");
      const pBrand = norm(p.brand || "");
      const pTier = norm(p.tier || "free");

      if (category && pCategory !== category) return false;
      if (brand && pBrand !== brand) return false;
      if (tier && pTier !== tier) return false;

      const price = pickPrice(p, plan);
      if (priceMin !== null && price < priceMin) return false;
      if (priceMax !== null && price > priceMax) return false;

      return true;
    });

    // 4) facets (baseadas no conjunto filtrado por query + plano, mas antes dos filtros específicos)
    const baseForFacets = searched;

    const facets = {
      categories: {},
      brands: {},
      tiers: {},
      priceMin: null,
      priceMax: null
    };

    let minP = Infinity;
    let maxP = -Infinity;

    for (const p of baseForFacets) {
      const c = (p.category || "Outros").trim();
      const b = (p.brand || "Outros").trim();
      const t = (p.tier || "free").toLowerCase();

      facets.categories[c] = (facets.categories[c] || 0) + 1;
      facets.brands[b] = (facets.brands[b] || 0) + 1;
      facets.tiers[t] = (facets.tiers[t] || 0) + 1;

      const price = pickPrice(p, plan);
      if (price > 0) {
        if (price < minP) minP = price;
        if (price > maxP) maxP = price;
      }
    }

    if (minP !== Infinity) facets.priceMin = Math.floor(minP);
    if (maxP !== -Infinity) facets.priceMax = Math.ceil(maxP);

    // 5) paginação final
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);

    const start = (safePage - 1) * limit;
    const produtos = filtered.slice(start, start + limit);

    return res.json({
      ok: true,
      query: q,
      plan,
      page: safePage,
      limit,
      total,
      totalPages,
      filtros: {
        category: category || null,
        brand: brand || null,
        tier: tier || null,
        priceMin,
        priceMax
      },
      facets,
      produtos
    });
  } catch (err) {
    console.error("[NEXUS] searchController erro:", err?.message || err);
    return res.status(500).json({ ok: false, error: "SEARCH_FAILED" });
  }
}
