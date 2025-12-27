import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pasta nova do catálogo modular
const CATALOG_DIR = path.join(__dirname, "..", "data", "catalog");
const INDEX_PATH = path.join(CATALOG_DIR, "index.json");

const rank = { free: 1, core: 2, hyper: 3, omega: 4 };

function norm(v) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Cache do index.json
let _indexCache = { mtimeMs: 0, data: null };

// Cache por arquivo de categoria
// key: absolutePath -> { mtimeMs, data }
const _fileCache = new Map();

function readJsonFileWithCache(absPath) {
  try {
    if (!fs.existsSync(absPath)) return null;

    const st = fs.statSync(absPath);
    const cached = _fileCache.get(absPath);

    if (cached && cached.mtimeMs === st.mtimeMs) return cached.data;

    const raw = fs.readFileSync(absPath, "utf-8");
    const data = JSON.parse(raw);

    _fileCache.set(absPath, { mtimeMs: st.mtimeMs, data });
    return data;
  } catch (e) {
    console.error("[SEARCH] Erro lendo JSON:", absPath, e?.message || e);
    return null;
  }
}

function loadIndex() {
  try {
    if (!fs.existsSync(INDEX_PATH)) return { categories: [] };

    const st = fs.statSync(INDEX_PATH);
    if (_indexCache.data && _indexCache.mtimeMs === st.mtimeMs) {
      return _indexCache.data;
    }

    const raw = fs.readFileSync(INDEX_PATH, "utf-8");
    const data = JSON.parse(raw);

    _indexCache = { mtimeMs: st.mtimeMs, data };
    return data;
  } catch (e) {
    console.error("[SEARCH] Erro carregando index.json:", e?.message || e);
    return { categories: [] };
  }
}

function getCategoryMap() {
  const idx = loadIndex();
  const cats = Array.isArray(idx?.categories) ? idx.categories : [];
  // id -> { id, title, file }
  const map = new Map();
  for (const c of cats) {
    if (!c?.id || !c?.file) continue;
    map.set(norm(c.id), c);
  }
  return map;
}

function loadCategoryProducts(catObj) {
  const abs = path.join(CATALOG_DIR, catObj.file);
  const data = readJsonFileWithCache(abs);

  // Aceita tanto array direto quanto {products:[...]} (caso no futuro você mude)
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.products)) return data.products;

  return [];
}

function tokenizeQuery(qNorm) {
  return qNorm.split(/\s+/).filter(Boolean);
}

export function searchController(req, res) {
  try {
    const qRaw = (req.query.q || "").toString();
    const q = norm(qRaw);

    const plan = norm(req.query.plan || "free") || "free";
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 60);

    // filtro opcional por categoria:
    // aceita cat=cpu | category=cpu | catId=cpu
    const catParam =
      norm(req.query.cat || req.query.category || req.query.catId || "");

    const catMap = getCategoryMap();

    // 1) carrega produtos (só 1 arquivo se cat foi passado, senão varre tudo)
    let catalog = [];

    if (catParam && catMap.has(catParam)) {
      const catObj = catMap.get(catParam);
      catalog = loadCategoryProducts(catObj);
    } else {
      // busca geral: varre todas as categorias do index
      for (const catObj of catMap.values()) {
        const arr = loadCategoryProducts(catObj);
        if (arr?.length) catalog.push(...arr);
      }
    }

    // 2) trava por plano (tier)
    const userRank = rank[plan] ?? 1;
    let filtered = catalog.filter((p) => {
      const t = norm(p?.tier || "free") || "free";
      const pr = rank[t] ?? 1;
      return pr <= userRank;
    });

    // 3) busca por termo (tokens)
    if (q) {
      const tokens = tokenizeQuery(q);

      filtered = filtered.filter((p) => {
        const hay = norm(
          [
            p?.title,
            p?.subtitle,
            p?.description,
            p?.brand,
            p?.category,
            Array.isArray(p?.tags) ? p.tags.join(" ") : "",
          ].join(" ")
        );

        return tokens.every((tk) => hay.includes(tk));
      });
    }

    // 4) ordenação: featured primeiro, depois alfabético
    filtered.sort((a, b) => {
      const fa = a?.featured ? 1 : 0;
      const fb = b?.featured ? 1 : 0;
      if (fb !== fa) return fb - fa;
      return String(a?.title || "").localeCompare(String(b?.title || ""), "pt-BR");
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
      // debug útil:
      _catalogMode: "catalog/index.json + catalog/*.json",
      _catalogDir: CATALOG_DIR,
      _indexPath: INDEX_PATH,
      _catFilterApplied: catParam || null,
    });
  } catch (e) {
    console.error("[SEARCH] ERRO:", e?.message || e);
    return res.status(500).json({ ok: false, error: "SEARCH_FAILED" });
  }
}
