import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const CATALOG_INDEX_PATH = path.join(DATA_DIR, "catalog.index.json");

// Cache
let catalogIndex = {};

// Load catalog index
function loadCatalogIndex() {
  try {
    catalogIndex = JSON.parse(fs.readFileSync(CATALOG_INDEX_PATH, "utf-8"));
    console.log(
      `[NEXUS] SearchCatalog carregado com ${Object.keys(catalogIndex).length} SKUs`
    );
  } catch (err) {
    console.error("[NEXUS] Erro ao carregar catalog.index.json na busca:", err.message);
    catalogIndex = {};
  }
}

loadCatalogIndex();

// Normaliza texto
function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Extrai números relevantes (ex: 4060, 16, 1000)
function extractNumbers(text) {
  const matches = text.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

// Palavras-chave por categoria (genérico)
const CATEGORY_KEYWORDS = {
  gpu: ["rtx", "rx", "gtx"],
  cpu: ["ryzen", "core", "xeon"],
  storage: ["ssd", "hdd", "nvme", "sata"],
  ram: ["ddr4", "ddr5"],
  audio: ["headset", "fone", "microfone"],
  network: ["router", "roteador", "switch"],
  camera: ["webcam", "camera"],
};

// Score genérico de relevância
function scoreProduct({ sku, entry, query }) {
  let score = 0;
  if (!query) return score;

  const haystack = normalize(
    `${sku} ${entry.category} ${entry.file}`
  );

  // Match direto
  if (haystack.includes(query)) score += 20;

  // Keywords por categoria
  const keywords = CATEGORY_KEYWORDS[entry.category] || [];
  keywords.forEach((k) => {
    if (query.includes(k) && haystack.includes(k)) {
      score += 15;
    }
  });

  // Match numérico
  const qNums = extractNumbers(query);
  const sNums = extractNumbers(sku);

  qNums.forEach((n) => {
    if (sNums.includes(n)) score += 25;
  });

  return score;
}

// Ordenação inteligente genérica
function sortProducts(a, b) {
  // Score primeiro
  if (b.score !== a.score) return b.score - a.score;

  // Maior número relevante primeiro (ex: 4090 > 4060, 2TB > 1TB)
  const aNums = extractNumbers(a.sku);
  const bNums = extractNumbers(b.sku);

  if (aNums.length && bNums.length) {
    const maxA = Math.max(...aNums);
    const maxB = Math.max(...bNums);
    if (maxA !== maxB) return maxB - maxA;
  }

  // Fallback estável
  return a.sku.localeCompare(b.sku);
}

export const searchController = {
  // GET /api/search?q=texto&category=gpu
  search: async (req, res) => {
    try {
      const q = normalize(req.query.q || "");
      const categoryFilter = req.query.category || null;

      const results = [];

      for (const sku of Object.keys(catalogIndex)) {
        const entry = catalogIndex[sku];
        if (!entry.active) continue;

        if (categoryFilter && entry.category !== categoryFilter) continue;

        const score = scoreProduct({ sku, entry, query: q });
        if (q && score === 0) continue;

        results.push({
          sku,
          category: entry.category,
          score,
        });
      }

      results.sort(sortProducts);

      return res.json({
        ok: true,
        total: results.length,
        products: results.map(({ score, ...rest }) => rest),
      });
    } catch (err) {
      console.error("[NEXUS] Erro na busca:", err);
      return res.status(500).json({
        ok: false,
        error: "SEARCH_ERROR",
      });
    }
  },
};
