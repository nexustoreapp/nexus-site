import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const CACHE_PATH = path.join(DATA_DIR, "live.cache.json");

// cache em disco
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

// fila simples em memória
const queue = new Map();

export const liveCatalogController = {
  // POST /api/live/request
  request: async (req, res) => {
    const { sku, supplier, supplierProductId, priority } = req.body || {};
    if (!sku || !supplier) {
      return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
    }

    queue.set(sku, {
      sku,
      supplier,
      supplierProductId: supplierProductId || null,
      priority: Number(priority || 1),
      createdAt: Date.now(),
    });

    return res.json({ ok: true, queued: true, size: queue.size });
  },

  // GET /api/live/jobs
  jobs: async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 10), 50);

    const items = Array.from(queue.values())
      .sort((a, b) => (b.priority - a.priority) || (a.createdAt - b.createdAt))
      .slice(0, limit);

    items.forEach((it) => queue.delete(it.sku));

    return res.json({ ok: true, jobs: items });
  },

  // POST /api/live/update
  update: async (req, res) => {
    const { sku, data } = req.body || {};
    if (!sku || !data) {
      return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
    }

    const cache = readCache();
    cache[sku] = {
      ...(cache[sku] || {}),
      ...data,
      updatedAt: Date.now(),
    };
    writeCache(cache);

    return res.json({ ok: true, saved: true });
  },

  // GET /api/live/get
  get: async (req, res) => {
    const skus = String(req.query.skus || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const cache = readCache();
    const items = skus
      .map((sku) => ({ sku, ...(cache[sku] || null) }))
      .filter(Boolean);

    return res.json({ ok: true, items });
  },

  // POST /api/live/request-batch
  requestBatch: async (req, res) => {
    const { supplier, priority, items } = req.body || {};

    if (!supplier || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: "INVALID_BATCH" });
    }

    for (const it of items) {
      if (!it?.sku) continue;

      queue.set(it.sku, {
        sku: it.sku,
        category: it.category || null,
        title: it.title || it.sku,
        supplier,
        supplierProductId: it.supplierProductId || null,
        priority: Number(priority || 1),
        createdAt: Date.now(),
      });
    }

    return res.json({ ok: true, queued: items.length, size: queue.size });
  }
};