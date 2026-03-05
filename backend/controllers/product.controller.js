// backend/controllers/product.controller.js

import fs from "fs";
import path from "path";
import { isBlockedRandomly } from "../utils/randomBlock.js";

const CATALOG_DIR = path.resolve("backend/data/catalog");

function getUserFromToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString("utf8")
    );
    return payload || null;
  } catch {
    return null;
  }
}

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
  list: (req, res) => {
    try {

      const user = getUserFromToken(req);

      const plan = (user?.plan || "free").toLowerCase();

      const products = loadAllProducts();

      const filteredProducts = products.map(product => {

        const blocked = isBlockedRandomly(product.sku || product.id, plan);

        return {
          ...product,
          locked: blocked
        };

      });

      return res.json({
        ok: true,
        plan,
        total: filteredProducts.length,
        products: filteredProducts
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

      const user = getUserFromToken(req);

      const plan = (user?.plan || "free").toLowerCase();

      const { sku } = req.params;

      const products = loadAllProducts();

      const product = products.find(p => p.sku === sku);

      if (!product) {

        return res.status(404).json({
          ok: false,
          error: "PRODUCT_NOT_FOUND"
        });

      }

      const blocked = isBlockedRandomly(product.sku || product.id, plan);

      return res.json({
        ok: true,
        locked: blocked,
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