import fs from "fs";
import path from "path";

const CATALOG_PATH = path.resolve("backend/data/catalogo.json");

const rank = { free: 1, core: 2, hyper: 3, omega: 4 };

function norm(v) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

let _cache = null;
function loadCatalog() {
  if (_cache) return _cache;
  if (!fs.existsSync(CATALOG_PATH)) return [];
  const raw = fs.readFileSync(CATALOG_PATH, "utf-8");
  _cache = JSON.parse(raw);
  return _cache;
}

export function searchController(req, res) {
  try {
    const catalog = loadCatalog();

    const qRaw = (req.query.q || "").toString();
    const q = norm(qRaw);

    const plan = norm(req.query.plan || "free") || "free";
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 60);

    // 1) começa com tudo
    let filtered = catalog;

    // 2) trava por plano
    const userRank = rank[plan] ?? 1;
    filtered = filtered.filter((p) => {
      const t = norm(p.tier || "free") || "free";
      const pr = rank[t] ?? 1;
      return pr <= userRank;
    });

    // 3) busca por termo (genérico tipo "headset gamer")
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);

      filtered = filtered.filter((p) => {
        const hay = norm(
          [
            p.title,
            p.subtitle,
            p.description,
            p.brand,
            p.category,
            Array.isArray(p.tags) ? p.tags.join(" ") : "",
          ].join(" ")
        );

        return tokens.every((tk) => hay.includes(tk));
      });
    }

    // 4) ordenação: featured primeiro, depois alfabético
    filtered.sort((a, b) => {
      const fa = a.featured ? 1 : 0;
      const fb = b.featured ? 1 : 0;
      if (fb !== fa) return fb - fa;
      return String(a.title || "").localeCompare(String(b.title || ""), "pt-BR");
    });

    // 5) paginação
    const total = filtered.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const start = (page - 1) * limit;
    const produtos = filtered.slice(start, start + limit);

    return res.json({
      ok: true,
      query: qRaw,
      plan,
      page,
      limit,
      total,
      totalPages,
      produtos,
      _catalogPath: CATALOG_PATH,
    });
  } catch (e) {
    console.error("[SEARCH] ERRO:", e?.message || e);
    return res.status(500).json({ ok: false, error: "SEARCH_FAILED" });
  }
}
