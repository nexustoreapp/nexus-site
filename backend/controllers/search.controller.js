import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// caminho certo do catálogo (backend/data/catalogo.json)
const CATALOG_PATH = path.join(__dirname, "..", "data", "catalogo.json");

const rank = { free: 1, core: 2, hyper: 3, omega: 4 };

// normaliza string pra busca (remove acento, lower, trim)
function norm(s = "") {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// lê catálogo com cache simples
let _catalog = null;
let _catalogMtime = 0;
function loadCatalog() {
  try {
    const st = fs.statSync(CATALOG_PATH);
    const mtime = st.mtimeMs;
    if (_catalog && mtime === _catalogMtime) return _catalog;

    const raw = fs.readFileSync(CATALOG_PATH, "utf8");
    const parsed = JSON.parse(raw);

    _catalog = Array.isArray(parsed) ? parsed : [];
    _catalogMtime = mtime;

    return _catalog;
  } catch (e) {
    console.error("[SEARCH] Falha ao carregar catálogo:", e?.message || e);
    _catalog = [];
    _catalogMtime = 0;
    return _catalog;
  }
}

export function handleSearch(req, res) {
  try {
    const catalog = loadCatalog();

    const qRaw = (req.query.q || "").toString();
    const q = norm(qRaw);

    const plan = norm(req.query.plan || "free") || "free";
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 60);

    // 1) começa com tudo
    let filtered = catalog;

    // 2) trava por plano (free vê só até o tier dele)
    const userRank = rank[plan] ?? 1;
    filtered = filtered.filter((p) => {
      const t = norm(p.tier || "free") || "free";
      const pr = rank[t] ?? 1;
      return pr <= userRank;
    });

    // 3) busca por termo (nome genérico tipo "headset gamer" funciona aqui)
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

        // regra: todos os tokens precisam aparecer em algum lugar
        return tokens.every((tk) => hay.includes(tk));
      });
    }

    // 4) ordenação simples: featured primeiro, depois alfabético
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