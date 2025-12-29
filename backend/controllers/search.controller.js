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

export const searchController = {
  // GET /api/search?q=texto&category=cpu
  search: async (req, res) => {
    try {
      const q = normalize(req.query.q || "");
      const categoryFilter = req.query.category || null;

      const results = [];

      for (const sku of Object.keys(catalogIndex)) {
        const entry = catalogIndex[sku];
        if (!entry.active) continue;

        if (categoryFilter && entry.category !== categoryFilter) {
          continue;
        }

        const haystack = normalize(`${sku} ${entry.category} ${entry.file}`);

        if (q && !haystack.includes(q)) continue;

        results.push({
          sku,
          category: entry.category,
        });
      }

      return res.json({
        ok: true,
        total: results.length,
        products: results,
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
