// backend/routes/product.routes.js

import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { getCache, setCache } from "../utils/catalogCache.js";
import { httpCache } from "../middlewares/httpCache.middleware.js";
import { isBlockedRandomly } from "../utils/randomBlock.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// pasta real do catálogo
const CATALOG_DIR = path.join(__dirname, "../data/catalogo");

function safeReadJson(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  } catch {
    return null;
  }
}

function normalizeString(v) {
  return String(v || "").trim();
}

function slugify(v) {
  return normalizeString(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProduct(raw, category, sourceFile) {
  const title =
    raw.title ||
    raw.name ||
    raw.nome ||
    raw.productName ||
    raw.product_name ||
    raw.label ||
    "Produto sem nome";

  const sku =
    raw.sku ||
    raw.id ||
    raw.code ||
    raw.codigo ||
    slugify(`${title}-${sourceFile}`);

  const price =
    Number(
      raw.price ??
      raw.pricePublic ??
      raw.preco ??
      raw.valor ??
      raw.amount ??
      0
    ) || 0;

  const accessTier =
    String(
      raw.accessTier ||
      raw.plan_required ||
      raw.plan ||
      raw.tier ||
      "free"
    ).toLowerCase();

  const images = Array.isArray(raw.images)
    ? raw.images
    : [raw.image, raw.img, raw.thumbnail].filter(Boolean);

  const tags = Array.isArray(raw.tags)
    ? raw.tags
    : String(raw.tags || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

  return {
    ...raw,
    sku: String(sku),
    id: raw.id || String(sku),
    title: String(title),
    subtitle: raw.subtitle || raw.subtitulo || "",
    description: raw.description || raw.descricao || "",
    price,
    pricePublic: Number(raw.pricePublic ?? price) || price,
    accessTier,
    category: raw.category || raw.categoria || category || "geral",
    image: images[0] || "logo.png",
    images,
    tags,
    stock: raw.stock || raw.estado || raw.status || "disponível"
  };
}

function loadAllProducts() {
  const cached = getCache("catalogo_normalizado");
  if (cached) return cached;

  const categories = fs.readdirSync(CATALOG_DIR, { withFileTypes: true });
  const products = [];

  for (const entry of categories) {
    if (!entry.isDirectory()) continue;

    const category = entry.name;
    const categoryPath = path.join(CATALOG_DIR, category);
    const files = fs.readdirSync(categoryPath);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filepath = path.join(categoryPath, file);
      const content = safeReadJson(filepath);

      if (!content) continue;

      if (Array.isArray(content)) {
        for (const item of content) {
          products.push(normalizeProduct(item, category, file));
        }
      } else {
        products.push(normalizeProduct(content, category, file));
      }
    }
  }

  setCache("catalogo_normalizado", products);
  return products;
}

function getPlanFromRequest(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) {
    return String(req.query.plan || "free").toLowerCase();
  }

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString("utf8")
    );

    return String(payload?.plan || req.query.plan || "free").toLowerCase();
  } catch {
    return String(req.query.plan || "free").toLowerCase();
  }
}

function planRank(plan) {
  if (plan === "omega") return 4;
  if (plan === "hyper") return 3;
  if (plan === "core") return 2;
  return 1;
}

function applyLocks(product, plan) {
  const required = planRank((product.accessTier || "free").toLowerCase());
  const current = planRank(plan);

  let blocked = current < required;

  if (!blocked && plan !== "omega") {
    blocked = isBlockedRandomly(product.sku, plan);
  }

  return {
    ...product,
    blocked
  };
}

// GET /api/v1/products?q=...
router.get("/", httpCache, async (req, res) => {
  try {
    const q = normalizeString(req.query.q).toLowerCase();
    const plan = getPlanFromRequest(req);

    let products = loadAllProducts().map(p => applyLocks(p, plan));

    if (q) {
      products = products.filter((p) => {
        const haystack = [
          p.sku,
          p.title,
          p.subtitle,
          p.description,
          p.category,
          ...(p.tags || [])
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    return res.json({
      ok: true,
      plan,
      total: products.length,
      products
    });
  } catch (err) {
    console.error("[PRODUCTS_LIST]", err);
    return res.status(500).json({
      ok: false,
      error: "PRODUCTS_UNAVAILABLE"
    });
  }
});

// GET /api/v1/products/:sku
router.get("/:sku", httpCache, async (req, res) => {
  try {
    const plan = getPlanFromRequest(req);
    const sku = normalizeString(req.params.sku);

    const product = loadAllProducts().find(
      (p) => String(p.sku) === sku
    );

    if (!product) {
      return res.status(404).json({
        ok: false,
        error: "PRODUCT_NOT_FOUND"
      });
    }

    const normalized = applyLocks(product, plan);

    return res.json({
      ok: true,
      plan,
      product: normalized
    });
  } catch (err) {
    console.error("[PRODUCT_BY_SKU]", err);
    return res.status(500).json({
      ok: false,
      error: "PRODUCT_UNAVAILABLE"
    });
  }
});

export default router;