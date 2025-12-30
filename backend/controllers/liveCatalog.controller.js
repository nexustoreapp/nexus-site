import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const CACHE_PATH = path.join(DATA_DIR, "live.cache.json");

// cache em disco (simples e eficiente)
function readCache() {
  try {
    if (!fs.existsSync(CACHE_PATH)) return {};
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeCache(cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

// fila simples em memória (pro worker pegar)
const queue = new Map(); // sku -> { sku, supplier, supplierProductId, priority, createdAt }

export const liveCatalogController = {
  // FRONT chama isso para “pedir atualização” de um sku
  // POST /api/live/request { sku, supplier, supplierProductId, priority }
  request: async (req, res) => {
    const { sku, supplier, supplierProductId, priority } = req.body || {};
    if (!sku || !supplier || !supplierProductId) {
      return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
    }

    queue.set(sku, {
      sku,
      supplier,
      supplierProductId,
      priority: Number(priority || 1),
      createdAt: Date.now(),
    });

    return res.json({ ok: true, queued: true, size: queue.size });
  },

  // WORKER puxa jobs
  // GET /api/live/jobs?limit=10
  jobs: async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 10), 50);

    const items = Array.from(queue.values())
      .sort((a, b) => (b.priority - a.priority) || (a.createdAt - b.createdAt))
      .slice(0, limit);

    // remove da fila (worker “pegou”)
    items.forEach((it) => queue.delete(it.sku));

    return res.json({ ok: true, jobs: items });
  },

  // WORKER envia resultado de volta
  // POST /api/live/update { sku, data }
  // data: { title, priceBRL, image, url, updatedAt }
  update: async (req, res) => {
    const { sku, data } = req.body || {};
    if (!sku || !data) return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });

    const cache = readCache();
    cache[sku] = {
      ...(cache[sku] || {}),
      ...data,
      updatedAt: Date.now(),
    };
    writeCache(cache);

    return res.json({ ok: true, saved: true });
  },

  // FRONT usa isso para renderizar cards com imagem + preço
  // GET /api/live/get?skus=SKU1,SKU2
  get: async (req, res) => {
    const skus = String(req.query.skus || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const cache = readCache();
    const items = skus.map((sku) => ({ sku, ...(cache[sku] || null) })).filter(Boolean);

    return res.json({ ok: true, items });
  },
};