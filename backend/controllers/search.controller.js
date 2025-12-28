// backend/controllers/search.controller.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const INDEX_PATH = path.join(DATA_DIR, "index.json");

// Cache simples
let catalogIndex = {};

// Carrega index.json
function loadIndex() {
  try {
    catalogIndex = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
    console.log(
      `[NEXUS] SearchIndex carregado com ${Object.keys(catalogIndex).length} SKU(s).`
    );
  } catch (err) {
    console.error("[NEXUS] Erro ao carregar index.json na busca:", err.message);
    catalogIndex = {};
  }
}

// Inicializa
loadIndex();

// Normaliza texto para busca
function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Busca principal
export const searchController = {
  // GET /api/search?q=texto&category=cpu
  search: async (req, res) => {
    try {
      const q = normalize(req.query.q || "");
      const categoryFilter = req.query.category || null;

      if (!q && !categoryFilter) {
        return res.json({
          ok: true,
          total: 0,
          products: [],
        });
      }

      const results = [];

      for (const sku of Object.keys(catalogIndex)) {
        const entry = catalogIndex[sku];
        if (!entry.active) continue;

        if (categoryFilter && entry.category !== categoryFilter) {
          continue;
        }

        // Busca por SKU ou nome aproximado
        const haystack = normalize(
          `${sku} ${entry.category} ${entry.file}`
        );

        if (q && !haystack.includes(q)) continue;

        results.push({
          sku,
          category: entry.category,
          file: entry.file,
        });
      }

      return res.json({
        ok: true,
        mode: "catalogo_nexus",
        total: results.length,
        products: results,
      });
    } catch (err) {
      console.error("[NEXUS] Erro na busca:", err);
      return res.status(500).json({
        ok: false,
        error: "Erro interno na busca.",
      });
    }
  },
};
