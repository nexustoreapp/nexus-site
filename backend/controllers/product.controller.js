import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { calculatePrice } from "../robot/priceEngine.js";
import { getSupplierBySKU } from "../supplierMap.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const CATALOG_INDEX_PATH = path.join(DATA_DIR, "catalog.index.json");

// Cache em memória
let catalogIndex = {};

// Carrega o catálogo canônico
function loadCatalogIndex() {
  try {
    catalogIndex = JSON.parse(fs.readFileSync(CATALOG_INDEX_PATH, "utf-8"));
    console.log(
      `[NEXUS] CatalogIndex carregado com ${Object.keys(catalogIndex).length} SKUs`
    );
  } catch (err) {
    console.error("[NEXUS] Erro ao carregar catalog.index.json:", err.message);
    catalogIndex = {};
  }
}

// Carrega no boot
loadCatalogIndex();

// Busca produto base no nicho
function getBaseProduct(sku) {
  const entry = catalogIndex[sku];
  if (!entry || !entry.active) return null;

  const nichePath = path.join(DATA_DIR, entry.file);
  if (!fs.existsSync(nichePath)) return null;

  const nicheData = JSON.parse(fs.readFileSync(nichePath, "utf-8"));
  return nicheData[sku] || null;
}

export const productController = {
  // GET /api/product/:sku?plan=free
  getById: async (req, res) => {
    try {
      const { sku } = req.params;
      const plan = req.query.plan || "free";

      const baseProduct = getBaseProduct(sku);
      if (!baseProduct) {
        return res.status(404).json({
          ok: false,
          error: "PRODUCT_NOT_FOUND",
        });
      }

      // Fornecedor (para preço)
      const supplier = getSupplierBySKU(sku);
      if (!supplier) {
        return res.status(500).json({
          ok: false,
          error: "SUPPLIER_NOT_MAPPED",
        });
      }

      const basePriceBRL = supplier.maxPrice;
      const finalPriceBRL = calculatePrice({ basePriceBRL, plan });

      return res.json({
        ok: true,
        mode: "catalogo_nexus",
        product: {
          sku: baseProduct.sku,
          title: baseProduct.title,
          brand: baseProduct.brand || null,
          category: catalogIndex[sku].category,
          image: baseProduct.image || null,
          images: baseProduct.images || [],
          specs: baseProduct.specs || {},
          price: finalPriceBRL,
          basePrice: basePriceBRL,
          plan,
        },
      });
    } catch (err) {
      console.error("[NEXUS] Erro ao buscar produto:", err);
      return res.status(500).json({
        ok: false,
        error: "PRODUCT_FETCH_ERROR",
      });
    }
  },

  // GET /api/product
  listAll: async (_req, res) => {
    try {
      const products = [];

      for (const sku of Object.keys(catalogIndex)) {
        const entry = catalogIndex[sku];
        if (!entry.active) continue;

        const baseProduct = getBaseProduct(sku);
        if (!baseProduct) continue;

        products.push({
          sku,
          title: baseProduct.title,
          category: entry.category,
          image: baseProduct.image || null,
        });
      }

      return res.json({
        ok: true,
        total: products.length,
        products,
      });
    } catch (err) {
      console.error("[NEXUS] Erro ao listar produtos:", err);
      return res.status(500).json({
        ok: false,
        error: "PRODUCT_LIST_ERROR",
      });
    }
  },
};
