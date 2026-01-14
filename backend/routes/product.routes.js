import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getCache, setCache } from "../utils/catalogCache.js";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = path.join(__dirname, "../catalogo");

/**
 * Lê catálogo inteiro por pasta
 */
function loadCatalog() {
  const result = [];

  const categories = fs.readdirSync(CATALOG_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const category of categories) {
    const files = fs.readdirSync(path.join(CATALOG_DIR, category))
      .filter(f => f.endsWith(".json"));

    for (const file of files) {
      const data = JSON.parse(
        fs.readFileSync(path.join(CATALOG_DIR, category, file), "utf-8")
      );

      result.push({
        category,
        ...data
      });
    }
  }

  return result;
}

/**
 * GET /products
 */
router.get("/", (req, res) => {
  const cached = getCache("catalog:all");
  if (cached) {
    return res.json({ ok: true, cached: true, products: cached });
  }

  const products = loadCatalog();
  setCache("catalog:all", products, 120_000); // 2 minutos

  res.json({ ok: true, cached: false, products });
});

export default router;