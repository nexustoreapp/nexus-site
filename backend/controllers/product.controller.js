// backend/controllers/product.controller.js
// Controller de produto FINAL
// - Fonte única: backend/data/catalog/*.json
// - Sem robot antigo
// - Sem priceEngine
// - Sem Shopify

import fs from "fs";
import path from "path";

const CATALOG_DIR = path.resolve("backend/data/catalog");

// Helper para ler todos os produtos
function loadAllProducts() {
  const files = fs.readdirSync(CATALOG_DIR).filter(f => f.endsWith(".json"));
  let products = [];

  for (const file of files) {
    const content = JSON.parse(
      fs.readFileSync(path.join(CATALOG_DIR, file), "utf-8")
    );
    products = products.concat(content);
  }

  return products;
}

export const productController = {
  // GET /api/products
  list: (_req, res) => {
    try {
      const products = loadAllProducts();
      return res.json({
        ok: true,
        total: products.length,
        products
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: err.message
      });
    }
  },

  // GET /api/products/:sku
  getBySku: (req, res) => {
    try {
      const { sku } = req.params;
      const products = loadAllProducts();
      const product = products.find(p => p.sku === sku);

      if (!product) {
        return res.status(404).json({
          ok: false,
          error: "PRODUCT_NOT_FOUND"
        });
      }

      return res.json({
        ok: true,
        product
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: err.message
      });
    }
  }
};