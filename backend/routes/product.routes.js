// backend/routes/product.routes.js
import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { getCache, setCache } from "../utils/catalogCache.js";
import { httpCache } from "../middlewares/httpCache.middleware.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📂 pasta real do seu catálogo (como você explicou)
const CATALOG_DIR = path.join(__dirname, "../data/catalogo");

router.get("/", httpCache, async (req, res) => {
  try {
    const cached = getCache("catalogo");
    if (cached) {
      return res.json({
        ok: true,
        cached: true,
        products: cached
      });
    }

    const categories = fs.readdirSync(CATALOG_DIR);
    const products = [];

    for (const category of categories) {
      const categoryPath = path.join(CATALOG_DIR, category);
      const files = fs.readdirSync(categoryPath);

      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const content = JSON.parse(
          fs.readFileSync(path.join(categoryPath, file), "utf-8")
        );

        products.push({
          category,
          ...content
        });
      }
    }

    setCache("catalogo", products);

    return res.json({
      ok: true,
      cached: false,
      products
    });

  } catch (err) {
    console.error("[CATALOG]", err);

    // 🛟 fallback automático
    const fallback = getCache("catalogo");
    if (fallback) {
      return res.json({
        ok: true,
        fallback: true,
        products: fallback
      });
    }

    return res.status(500).json({
      ok: false,
      error: "CATALOG_UNAVAILABLE"
    });
  }
});

export default router;