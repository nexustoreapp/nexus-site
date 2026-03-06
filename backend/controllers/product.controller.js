// backend/controllers/product.controller.js

import fs from "fs";
import path from "path";
import { isBlockedRandomly } from "../utils/randomBlock.js";

const CATALOG_DIR = path.resolve("backend/data/catalog");

// carrega todos os produtos
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

function planRank(plan) {

  const map = {
    free: 1,
    core: 2,
    hyper: 3,
    omega: 4
  };

  return map[plan] || 1;

}

export const productController = {

  // LISTAR PRODUTOS
  list: (req, res) => {

    try {

      const plan = String(req.query.plan || "free").toLowerCase();

      const products = loadAllProducts();

      const result = products.map(p => {

        const tier = String(p.accessTier || "free").toLowerCase();

        const required = planRank(tier);
        const userRank = planRank(plan);

        let locked = userRank < required;

        if (!locked) {

          const randomBlocked = isBlockedRandomly(p.sku, plan);

          if (randomBlocked) locked = true;

        }

        return {
          ...p,
          locked
        };

      });

      return res.json({
        ok: true,
        total: result.length,
        products: result
      });

    } catch (err) {

      return res.status(500).json({
        ok: false,
        error: err.message
      });

    }

  },

  // PRODUTO INDIVIDUAL
  getBySku: (req, res) => {

    try {

      const { sku } = req.params;
      const plan = String(req.query.plan || "free").toLowerCase();

      const products = loadAllProducts();

      const product = products.find(p => p.sku === sku);

      if (!product) {

        return res.status(404).json({
          ok: false,
          error: "PRODUCT_NOT_FOUND"
        });

      }

      const tier = String(product.accessTier || "free").toLowerCase();

      const required = planRank(tier);
      const userRank = planRank(plan);

      let locked = userRank < required;

      if (!locked) {

        const randomBlocked = isBlockedRandomly(product.sku, plan);

        if (randomBlocked) locked = true;

      }

      return res.json({
        ok: true,
        product,
        locked
      });

    } catch (err) {

      return res.status(500).json({
        ok: false,
        error: err.message
      });

    }

  }

};