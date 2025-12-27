import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_DIR = path.join(__dirname, "..", "data", "catalog");
const INDEX_PATH = path.join(CATALOG_DIR, "index.json");

// =========================
// NORMALIZAÇÃO
// =========================
function norm(v) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// =========================
// STOPWORDS
// =========================
const STOPWORDS = new Set([
  "e", "de", "da", "do", "para", "pra", "com",
  "um", "uma", "o", "a", "os", "as"
]);

function tokenize(q) {
  return norm(q)
    .split(/\s+/)
    .filter(t => t && !STOPWORDS.has(t));
}

// =========================
// DICIONÁRIO DE INTENÇÃO (PESADO)
// =========================
const INTENT_CATEGORIES = {
  cpu: ["cpu", "processador", "intel", "amd", "ryzen", "core", "i3", "i5", "i7", "i9"],
  gpu: ["gpu", "placa", "placa de video", "placa grafica", "rtx", "gtx", "radeon"],
  motherboard: ["placa mae", "motherboard", "b450", "b550", "b660", "z690"],
  ram: ["ram", "memoria", "ddr4", "ddr5"],
  storage: ["ssd", "hd", "hdd", "armazenamento", "nvme"],
  psu: ["fonte", "psu", "power supply", "650w", "750w"],
  cooling: ["cooler", "water cooler", "aio"],
  case: ["gabinete", "case"],
  peripherals: ["periferico", "teclado", "mouse", "headset", "webcam"],
  notebook: ["notebook", "laptop"],
  monitor: ["monitor", "tela"],
  tv: ["tv", "televisao", "smart tv"],
  mobile: ["celular", "smartphone", "telefone"],
  smartwatch: ["smartwatch", "relogio"],
  network: ["roteador", "wifi", "rede", "ethernet"],
  console: ["console", "videogame", "ps5", "xbox"],
  accessories: ["acessorio", "cabo", "adaptador", "carregador"]
};

const BRANDS = [
  "intel", "amd", "nvidia", "asus", "msi", "gigabyte",
  "corsair", "kingston", "hyperx", "logitech",
  "razer", "redragon", "samsung", "lg", "dell",
  "lenovo", "acer", "apple", "xiaomi"
];

// =========================
// CACHE
// =========================
let indexCache = null;
let fileCache = new Map();

function loadIndex() {
  if (indexCache) return indexCache;
  const raw = fs.readFileSync(INDEX_PATH, "utf-8");
  indexCache = JSON.parse(raw);
  return indexCache;
}

function loadCategoryFile(file) {
  if (fileCache.has(file)) return fileCache.get(file);
  const abs = path.join(CATALOG_DIR, file);
  if (!fs.existsSync(abs)) return [];
  const data = JSON.parse(fs.readFileSync(abs, "utf-8"));
  const arr = Array.isArray(data) ? data : data.products || [];
  fileCache.set(file, arr);
  return arr;
}

// =========================
// SEARCH CONTROLLER
// =========================
export function searchController(req, res) {
  try {
    const qRaw = req.query.q || "";
    const q = norm(qRaw);
    const tokens = tokenize(q);

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(parseInt(req.query.limit || "24", 10), 60);

    // Detecta intenção
    const intentCats = new Set();
    const intentBrands = new Set();

    for (const t of tokens) {
      for (const [cat, words] of Object.entries(INTENT_CATEGORIES)) {
        if (words.some(w => t.includes(norm(w)))) {
          intentCats.add(cat);
        }
      }
      if (BRANDS.includes(t)) intentBrands.add(t);
    }

    // Carrega catálogo
    const index = loadIndex();
    let catalog = [];

    for (const c of index.categories) {
      catalog.push(...loadCategoryFile(c.file));
    }

    // Score dos produtos
    let results = catalog.map(p => {
      let score = 0;
      const hay = norm(`${p.title} ${p.brand} ${p.category}`);

      tokens.forEach(t => {
        if (hay.includes(t)) score += 2;
      });

      if (intentCats.size && intentCats.has(norm(p.category))) score += 5;
      if (intentBrands.size && intentBrands.has(norm(p.brand))) score += 5;

      return { ...p, _score: score };
    });

    results = results.filter(p => p._score > 0);
    results.sort((a, b) => b._score - a._score);

    const total = results.length;
    const start = (page - 1) * limit;
    const produtos = results.slice(start, start + limit);

    return res.json({
      ok: true,
      query: qRaw,
      total,
      page,
      limit,
      produtos
    });
  } catch (e) {
    console.error("[SEARCH ERROR]", e);
    return res.status(500).json({ ok: false, error: "SEARCH_FAILED" });
  }
}
