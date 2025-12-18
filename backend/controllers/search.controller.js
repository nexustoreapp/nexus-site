// backend/controllers/search.controller.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// procura o catálogo nesses lugares (local + Render)
const CANDIDATE_PATHS = [
  path.resolve(process.cwd(), "backend", "data", "catalogo.json"),
  path.resolve(process.cwd(), "data", "catalogo.json"),
  path.resolve(__dirname, "..", "data", "catalogo.json"),
];

function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function loadCatalogOrThrow() {
  let lastErr = null;

  for (const p of CANDIDATE_PATHS) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf8");
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
          throw new Error("catalogo.json precisa ser um ARRAY [] de produtos");
        }
        console.log("[NEXUS] Catálogo carregado:", p, "items:", parsed.length);
        return parsed;
      }
    } catch (e) {
      lastErr = e;
      console.warn("[NEXUS] Falha lendo catálogo em:", p, "-", e?.message || e);
    }
  }

  throw lastErr || new Error("catalogo.json não encontrado");
}

// cache em memória (não relê o arquivo a cada request)
let CATALOG = [];
try {
  CATALOG = loadCatalogOrThrow();
} catch (e) {
  console.error("[NEXUS] Catálogo NÃO carregado:", e?.message || e);
  CATALOG = [];
}

const rank = { free: 0, core: 1, hyper: 2, omega: 3 };

// “rotação diária” determinística (free vê uma amostra que muda todo dia)
function dailySeed() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function seededShuffle(arr, seedStr) {
  // xorshift32 baseado num hash simples da seed
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;

  function rnd() {
    seed ^= seed << 13; seed >>>= 0;
    seed ^= seed >> 17; seed >>>= 0;
    seed ^= seed << 5;  seed >>>= 0;
    return (seed >>> 0) / 4294967296;
  }

  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function paginate(items, page, limit) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const p = Math.min(Math.max(1, page), totalPages);
  const start = (p - 1) * limit;
  const end = start + limit;
  return {
    page: p,
    limit,
    total,
    totalPages,
    slice: items.slice(start, end),
  };
}

export const searchController = {
  // GET /api/search?q=&plan=&page=&limit=
  search(req, res) {
    try {
      const qRaw = (req.query.q || "").toString();
      const plan = (req.query.plan || "free").toString().toLowerCase();
      const page = Number(req.query.page || 1);
      const limit = Math.min(Math.max(Number(req.query.limit || 24), 1), 60);

      const userRank = rank[plan] ?? 0;
      const q = normalize(qRaw);

      // 1) filtra por plano (o item tem tier)
      let base = CATALOG.filter((p) => {
        const t = (p.tier || "free").toString().toLowerCase();
        const itemRank = rank[t] ?? 0;
        return userRank >= itemRank;
      });

      // 2) filtra por texto (se tiver query)
      if (q) {
        base = base.filter((p) => {
          const hay =
            normalize(p.title) + " " +
            normalize(p.subtitle) + " " +
            normalize(p.brand) + " " +
            normalize(p.category) + " " +
            normalize(p.description) + " " +
            normalize((p.tags || []).join(" "));
          return hay.includes(q);
        });
      }

      // 3) ordena: featured primeiro, depois mais barato (public)
      base.sort((a, b) => {
        const fa = a.featured ? 1 : 0;
        const fb = b.featured ? 1 : 0;
        if (fb !== fa) return fb - fa;
        return Number(a.pricePublic || 0) - Number(b.pricePublic || 0);
      });

      // 4) regra do FREE: não pode ver tudo — vê amostra rotativa diária
      if (plan === "free") {
        const seed = dailySeed();
        const shuffled = seededShuffle(base, seed);
        const SAMPLE_SIZE = 60; // ajuste aqui (free vê 60/dia)
        base = shuffled.slice(0, SAMPLE_SIZE);
      }

      const pg = paginate(base, page, limit);

      return res.json({
        ok: true,
        query: qRaw,
        plan,
        page: pg.page,
        limit: pg.limit,
        total: pg.total,
        totalPages: pg.totalPages,
        produtos: pg.slice,
      });
    } catch (err) {
      console.error("[SEARCH] ERRO:", err?.message || err);
      return res.status(500).json({ ok: false, error: "SEARCH_FAILED" });
    }
  },
};
