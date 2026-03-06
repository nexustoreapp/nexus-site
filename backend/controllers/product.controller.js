// backend/controllers/product.controller.js

import fs from "fs";
import path from "path";
import { isBlockedRandomly } from "../utils/randomBlock.js";

const CATALOG_DIR = path.resolve("backend/data/catalog");

/* ===============================
   carregar catálogo inteiro
================================ */
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

/* ===============================
   helper busca
================================ */
function matchesQuery(product, q) {

  if (!q) return true;

  const text = `
    ${product.title || ""}
    ${product.description || ""}
    ${product.category || ""}
    ${product.sku || ""}
  `.toLowerCase();

  return text.includes(q.toLowerCase());
}

/* ===============================
   GET /api/products
================================ */
export async function listProducts(req, res) {

  try {

    const q = String(req.query.q || "").trim().toLowerCase();
    const plan = String(req.query.plan || "free").toLowerCase();

    const products = loadAllProducts();

    const filtered = products
      .filter(p => matchesQuery(p, q))
      .map(p => {

        const blocked = isBlockedRandomly(p.sku, plan);

        return {
          ...p,
          blocked
        };

      });

    return res.json({
      ok: true,
      total: filtered.length,
      products: filtered
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      ok: false,
      error: "PRODUCT_LIST_ERROR"
    });

  }

}

/* ===============================
   GET /api/products/:sku
================================ */
export async function getProductBySku(req, res) {

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

    console.error(err);

    return res.status(500).json({
      ok: false,
      error: "PRODUCT_GET_ERROR"
    });

  }

}