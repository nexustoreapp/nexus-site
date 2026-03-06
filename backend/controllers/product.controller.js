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

    if (Array.isArray(content)) {
      products = products.concat(content);
    }

  }

  return products;

}

/* ===============================
   LISTAR PRODUTOS
================================ */

export function listProducts(req, res) {

  try {

    const q = String(req.query.q || "").toLowerCase();
    const plan = String(req.query.plan || "free").toLowerCase();

    let products = loadAllProducts();

    /* ===============================
       BUSCA INTELIGENTE
    ================================ */

    if (q) {

      products = products.filter(p => {

        const text = `
          ${p.title || ""}
          ${p.subtitle || ""}
          ${p.description || ""}
          ${p.category || ""}
          ${p.brand || ""}
          ${p.sku || ""}
        `.toLowerCase();

        return text.includes(q);

      });

    }

    /* ===============================
       RANDOM BLOCK POR PLANO
    ================================ */

    products = products.map(p => {

      const blocked = isBlockedRandomly(p.sku || p.id || "", plan);

      return {
        ...p,
        blocked
      };

    });

    return res.json({
      ok: true,
      total: products.length,
      products
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      ok: false,
      error: "PRODUCT_LOAD_ERROR"
    });

  }

}

/* ===============================
   PRODUTO POR SKU
================================ */

export function getProductBySku(req, res) {

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
      error: "PRODUCT_ERROR"
    });

  }

}