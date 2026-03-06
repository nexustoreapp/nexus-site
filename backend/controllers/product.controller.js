// backend/controllers/product.controller.js

import fs from "fs";
import path from "path";
import { isBlockedRandomly } from "../utils/randomBlock.js";

const CATALOG_DIR = path.resolve("backend/data/catalog");

/* ================================
CARREGAR TODOS OS PRODUTOS
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

/* ================================
LISTAR PRODUTOS
================================ */

export function listProducts(req, res) {
  try {

    const q = (req.query.q || "").toLowerCase();
    const plan = (req.query.plan || "free").toLowerCase();

    let products = loadAllProducts();

    /* ================================
    FILTRO DE BUSCA
    ================================= */

    if (q) {
      products = products.filter(p =>
        (p.title || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q)
      );
    }

    /* ================================
    RANDOM BLOCK
    ================================= */

    products = products.map(p => {

      const blocked = isBlockedRandomly(p.sku, plan);

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

    console.error("[PRODUCT LIST ERROR]", err);

    return res.status(500).json({
      ok: false,
      error: "PRODUCT_LIST_FAILED"
    });

  }
}

/* ================================
BUSCAR POR SKU
================================ */

export function getProductBySku(req, res) {
  try {

    const { sku } = req.params;

    const products = loadAllProducts();

    const product = products.find(p => p.sku === sku);

    if (!product) {
      return res.status(404).json({
        ok:false,
        error:"PRODUCT_NOT_FOUND"
      });
    }

    return res.json({
      ok:true,
      product
    });

  } catch (err) {

    console.error("[PRODUCT GET ERROR]", err);

    return res.status(500).json({
      ok:false,
      error:"PRODUCT_FETCH_FAILED"
    });

  }
}