// backend/controllers/product.controller.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📌 Caminhos base
const DATA_DIR = path.join(__dirname, "..", "data");
const INDEX_PATH = path.join(DATA_DIR, "index.json");

// Cache simples em memória
let catalogIndex = {};

// 🔁 Carrega o index.json (catálogo canônico)
function loadIndex() {
  try {
    const raw = fs.readFileSync(INDEX_PATH, "utf-8");
    catalogIndex = JSON.parse(raw);
    console.log(
      `[NEXUS] CatalogIndex carregado com ${Object.keys(catalogIndex).length} SKU(s).`
    );
  } catch (e) {
    console.error("[NEXUS] Erro ao carregar index.json:", e.message);
    catalogIndex = {};
  }
}

// Carrega ao subir o servidor
loadIndex();

// 🔎 Busca produto completo por SKU
function getProductBySKU(sku) {
  const entry = catalogIndex[sku];
  if (!entry || !entry.active) return null;

  const nicheFile = path.join(DATA_DIR, entry.file);

  try {
    const raw = fs.readFileSync(nicheFile, "utf-8");
    const nicheData = JSON.parse(raw);
    return nicheData[sku] || null;
  } catch (e) {
    console.error(`[NEXUS] Erro ao abrir nicho ${entry.file}:`, e.message);
    return null;
  }
}

export const productController = {
  // GET /api/product/:sku
  getById: async (req, res) => {
    try {
      const { sku } = req.params;

      if (!sku) {
        return res.status(400).json({
          ok: false,
          error: "Nenhum SKU informado.",
        });
      }

      const product = getProductBySKU(sku);

      if (!product) {
        return res.status(404).json({
          ok: false,
          error: "Produto não encontrado ou inativo no catálogo.",
        });
      }

      // 🔹 Produto base (preço entra depois via robô)
      return res.json({
        ok: true,
        mode: "catalogo_nexus",
        product: {
          sku: product.sku,
          title: product.title,
          brand: product.brand || null,
          category: catalogIndex[sku].category,
          image: product.image || null,
          images: product.images || [],
          specs: product.specs || {},
        },
      });
    } catch (err) {
      console.error("[NEXUS] Erro ao buscar produto:", err);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao buscar produto.",
      });
    }
  },

  // GET /api/product (lista todos os ativos)
  listAll: async (_req, res) => {
    try {
      const products = [];

      for (const sku of Object.keys(catalogIndex)) {
        const entry = catalogIndex[sku];
        if (!entry.active) continue;

        const product = getProductBySKU(sku);
        if (product) {
          products.push({
            sku,
            title: product.title,
            category: entry.category,
            image: product.image || null,
          });
        }
      }

      return res.json({
        ok: true,
        mode: "catalogo_nexus",
        total: products.length,
        products,
      });
    } catch (err) {
      console.error("[NEXUS] Erro ao listar produtos:", err);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao listar produtos.",
      });
    }
  },
};
