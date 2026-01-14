// backend/routes/product.routes.js
import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_PATH = path.join(__dirname, "../data/catalogo");

/*
  🔹 Lista TODOS os produtos de TODOS os nichos
*/
router.get("/", (req, res) => {
  try {
    const files = fs.readdirSync(CATALOG_PATH);
    let allProducts = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const data = JSON.parse(
        fs.readFileSync(path.join(CATALOG_PATH, file), "utf-8")
      );

      if (Array.isArray(data)) {
        allProducts = allProducts.concat(data);
      }
    }

    res.json({
      ok: true,
      total: allProducts.length,
      products: allProducts
    });

  } catch (err) {
    console.error("[PRODUCT LIST ERROR]", err);
    res.status(500).json({ ok:false, error:"CATALOG_READ_ERROR" });
  }
});

/*
  🔹 Produto por ID (busca em TODOS os arquivos)
*/
router.get("/:id", (req, res) => {
  try {
    const files = fs.readdirSync(CATALOG_PATH);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const data = JSON.parse(
        fs.readFileSync(path.join(CATALOG_PATH, file), "utf-8")
      );

      const product = data.find(p => p.id === req.params.id);
      if (product) {
        return res.json({ ok:true, product });
      }
    }

    return res.status(404).json({
      ok:false,
      error:"PRODUCT_NOT_FOUND"
    });

  } catch (err) {
    console.error("[PRODUCT GET ERROR]", err);
    res.status(500).json({ ok:false, error:"CATALOG_READ_ERROR" });
  }
});

export default router;