// backend/controllers/product.controller.js

import fs from "fs";
import path from "path";
import { isBlockedRandomly } from "../utils/randomBlock.js";

const CATALOG_DIR = path.resolve("backend/data/catalog");

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

function getUserPlan(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) return "free";

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString("utf8")
    );

    return payload?.plan || "free";
  } catch {
    return "free";
  }
}

export const productController = {

  list: (req, res) => {
    try {

      const plan = getUserPlan(req);

      const products = loadAllProducts().map(product => {

        const blocked = isBlockedRandomly(product.sku, plan);

        return {
          ...product,
          blocked
        };

      });

      return res.json({
        ok: true,
        plan,
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

  getBySku: (req, res) => {
    try {

      const { sku } = req.params;
      const plan = getUserPlan(req);

      const products = loadAllProducts();
      const product = products.find(p => p.sku === sku);

      if (!product) {
        return res.status(404).json({
          ok: false,
          error: "PRODUCT_NOT_FOUND"
        });
      }

      const blocked = isBlockedRandomly(product.sku, plan);

      return res.json({
        ok: true,
        product: {
          ...product,
          blocked
        }
      });

    } catch (err) {

      return res.status(500).json({
        ok: false,
        error: err.message
      });

    }
  }
};