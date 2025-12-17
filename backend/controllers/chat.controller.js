// backend/controllers/search.controller.js
import fs from "fs";
import path from "path";

function getCatalogPath() {
  // garante o caminho certo no Render e local
  return path.resolve(process.cwd(), "backend", "data", "catalogo.json");
}

function readCatalogSafe() {
  try {
    const p = getCatalogPath();
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw);

    // aceita array direto ou { items: [] }
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;

    return [];
  } catch (err) {
    console.error("[SEARCH] Falha ao ler catalogo.json:", err?.message || err);
    return [];
  }
}

function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const searchController = {
  // GET /api/search?q=...&plan=free|core|hyper|omega
  handleSearch: async (req, res) => {
    try {
      const q = (req.query.q || "").toString();
      const plan = (req.query.plan || "free").toString();

      const term = normalize(q);
      const catalog = readCatalogSafe();

      if (!term) {
        return res.json({ ok: true, total: 0, items: [] });
      }

      // filtro por texto
      let results = catalog.filter((p) => {
        const hay =
          normalize(p.title) +
          " " +
          normalize(p.subtitle) +
          " " +
          normalize(p.brand) +
          " " +
          normalize(p.category) +
          " " +
          normalize(p.description) +
          " " +
          normalize((p.tags || []).join(" "));
        return hay.includes(term);
      });

      // regra simples de acesso por plano (se o item tiver "tier")
      // free < core < hyper < omega
      const rank = { free: 0, core: 1, hyper: 2, omega: 3 };
      const userRank = rank[plan] ?? 0;

      results = results.filter((p) => {
        const tier = (p.tier || "free").toString();
        const itemRank = rank[tier] ?? 0;
        return userRank >= itemRank;
      });

      // ordena por "featured" e depois por preço
      results.sort((a, b) => {
        const fa = a.featured ? 1 : 0;
        const fb = b.featured ? 1 : 0;
        if (fb !== fa) return fb - fa;

        const pa = Number(a.pricePublic || 0);
        const pb = Number(b.pricePublic || 0);
        return pa - pb;
      });

      // limita pra não explodir o front
      results = results.slice(0, 120);

      return res.json({
        ok: true,
        total: results.length,
        items: results,
      });
    } catch (err) {
      console.error("[SEARCH] ERRO:", err?.message || err);
      return res.status(500).json({
        ok: false,
        error: "Falha ao buscar produtos.",
      });
    }
  },
};
