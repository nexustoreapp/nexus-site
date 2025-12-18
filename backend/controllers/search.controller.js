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

export async function searchController(req, res) {
  try {
    const q = norm(req.query.q || "");
    const plan = norm(req.query.plan || "free") || "free";

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(60, Math.max(6, parseInt(req.query.limit || "24", 10)));

    const catalog = loadCatalog();

    // 1) filtra por plano (não mostra acima do plano do usuário)
    const filteredByPlan = catalog.filter(p => {
      const t = norm(p.tier || "free") || "free";
      return (rank[plan] || 1) >= (rank[t] || 1);
    });

    // 2) filtra por query (titulo, categoria, marca, tags)
    const filtered = q
      ? filteredByPlan.filter(p => {
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
      : filteredByPlan;

    // 3) total + paginação
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
      produtos
    });
  } catch (err) {
    console.error("[NEXUS] searchController erro:", err?.message || err);
    return res.status(500).json({ ok: false, error: "SEARCH_FAILED" });
  }
}
