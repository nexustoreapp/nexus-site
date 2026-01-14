// backend/routes/product.routes.js
import { Router } from "express";
import fs from "fs";
import path from "path";
import { getCache, setCache } from "../utils/cache.js";

const router = Router();
const CATALOG_PATH = path.resolve("backend/data/catalogo");

router.get("/", (req, res) => {
  const cached = getCache("catalogo");

  if (cached) {
    return res.json({
      ok: true,
      cached: true,
      products: cached
    });
  }

  const products = [];

  const files = fs.readdirSync(CATALOG_PATH);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const data = JSON.parse(
      fs.readFileSync(path.join(CATALOG_PATH, file), "utf-8")
    );

    products.push(...data);
  }

  setCache("catalogo", products, 120_000); // 2 minutos

  return res.json({
    ok: true,
    cached: false,
    products
  });
});

export default router;