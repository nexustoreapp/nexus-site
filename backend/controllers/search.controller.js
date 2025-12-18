// backend/controllers/search.controller.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RANK = { free: 0, core: 1, hyper: 2, omega: 3 };

// tenta achar o catálogo em local + Render
const POSSIBLE_PATHS = [
  path.join(process.cwd(), "backend", "data", "catalogo.json"),
  path.join(process.cwd(), "data", "catalogo.json"),
  path.join(__dirname, "..", "data", "catalogo.json"),
  path.join(__dirname, "data", "catalogo.json"),
];

function readCatalogOrThrow() {
  for (const p of POSSIBLE_PATHS) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      // se tiver BOM invisível, remove
      const clean = raw.replace(/^\uFEFF/, "");
      const parsed = JSON.parse(clean);
      if (!Array.isArray(parsed)) {
        throw new Error(`catalogo.json não é array em: ${p}`);
      }
      return { catalog: parsed, usedPath: p };
    }
  }
  throw new Error("catalogo.json não encontrado (verifique backend/data/catalogo.json)");
}

function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// hash simples e determinístico (pra rotação diária sem “random doido”)
function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function dayKey() {
  const d = new Date();
  // rotação diária: YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// regra: FREE vê só uma % do catálogo por dia (rotaciona), mas ainda pode conter itens core/hyper/omega (vai aparecer “bloqueado” no front)
function freeDailyGate(itemId, pct = 18) {
  const seed = dayKey(); // muda 1x por dia
  const h = hash32(`${seed}::${itemId}`);
  return (h % 100) < pct; // ~18% do catálogo por dia
}

export const searchController = {
  catalog(req, res) {
    try {
      const qRaw = (req.query.q || "").toString();
      const q = normalize(qRaw);

      const plan = normalize(req.query.plan || "free");
      const userRank = RANK[plan] ?? 0;

      const page = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 60);

      const { catalog, usedPath } = readCatalogOrThrow();

      // 1) base = catálogo inteiro
      let base = catalog;

      // 2) se for FREE: aplica rotação diária (não deixa “ver tudo”)
      if (userRank === 0) {
        base = base.filter((p) => freeDailyGate(p?.id || "", 18));
      }

  // 3) busca inteligente: tokens + categoria (headset gamer / notebook gamer / pc gamer etc.)
let filtered = base;

const rawTokens = normalize(qRaw).split(/\s+/).filter(Boolean);

// remove palavras “genéricas” que só atrapalham
const STOP = new Set(["gamer", "gaming", "barato", "oferta", "promo", "promocao", "menor", "preco", "preco", "pc"]);
const tokens = rawTokens.filter(t => !STOP.has(t));

// mapeia termos para categorias
const CATEGORY_MAP = [
  { keys: ["headset", "fone", "foneouvido", "fone-de-ouvido"], cat: "headset" },
  { keys: ["teclado", "keyboard"], cat: "teclado" },
  { keys: ["mouse"], cat: "mouse" },
  { keys: ["monitor", "tela"], cat: "monitor" },
  { keys: ["notebook", "laptop"], cat: "notebook" },
  { keys: ["ssd", "nvme"], cat: "ssd" },
  { keys: ["ram", "memoria"], cat: "memória ram" },
  { keys: ["gpu", "placa", "video", "vga", "rtx", "radeon"], cat: "placa de vídeo" },
  { keys: ["cpu", "processador", "ryzen", "intel", "core"], cat: "processador" },
  { keys: ["fonte", "psu"], cat: "fonte" },
  { keys: ["gabinete", "case"], cat: "gabinete" },
  { keys: ["roteador", "router", "wifi"], cat: "roteador" },
  { keys: ["controle", "controller"], cat: "controle" },
  { keys: ["microfone", "mic"], cat: "microfone" },
  { keys: ["webcam", "camera"], cat: "webcam" },
  { keys: ["vr", "oculos", "quest", "psvr"], cat: "vr" },
];

// tenta detectar categoria pela query
let detectedCategory = "";
for (const m of CATEGORY_MAP) {
  if (m.keys.some(k => rawTokens.includes(k))) {
    detectedCategory = m.cat;
    break;
  }
}

// monta lista de candidatos
filtered = base.filter((p) => {
  const hay =
    normalize(p.title) + " " +
    normalize(p.subtitle) + " " +
    normalize(p.brand) + " " +
    normalize(p.category) + " " +
    normalize(p.description) + " " +
    normalize((p.tags || []).join(" "));

  // 1) se detectou categoria: exige categoria bater
  if (detectedCategory) {
    const cat = normalize(p.category);
    if (!cat.includes(detectedCategory)) return false;
  }

  // 2) tokens restantes precisam bater (se houver)
  if (tokens.length) {
    return tokens.every((t) => hay.includes(t));
  }

  // se só categoria já resolveu, deixa passar
  return true;
});

      // 4) ordenação: featured primeiro, depois por menor preço público (pra parecer “ML style”)
      filtered.sort((a, b) => {
        const fa = a.featured ? 1 : 0;
        const fb = b.featured ? 1 : 0;
        if (fb !== fa) return fb - fa;

        const pa = Number(a.pricePublic ?? a.pricePremium ?? 0);
        const pb = Number(b.pricePublic ?? b.pricePremium ?? 0);
        return pa - pb;
      });

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
        // debug leve (não atrapalha): ajuda se der ruim no Render
        _catalogPath: usedPath,
        _freeRotation: userRank === 0 ? dayKey() : null,
      });
    } catch (err) {
      console.error("[SEARCH] ERRO:", err?.message || err);
      return res.status(500).json({
        ok: false,
        error: "SEARCH_FAILED",
      });
    }
  },
};
