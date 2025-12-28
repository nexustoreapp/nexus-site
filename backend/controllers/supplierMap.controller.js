import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAP_PATH = path.join(__dirname, "..", "data", "supplier_map.json");

function readMap() {
  return JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
}
function writeMap(map) {
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2));
}

export function mapLookupBySku(req, res) {
  try {
    const sku = String(req.params.sku || "").trim();
    const map = readMap();
    const item = map.bySku?.[sku] || null;
    return res.json({ ok: true, sku, item });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "MAP_LOOKUP_SKU_FAILED" });
  }
}

export function mapLookupByProvider(req, res) {
  try {
    const provider = String(req.params.provider || "").trim();
    const providerId = String(req.params.providerId || "").trim();
    const map = readMap();
    const sku = map.byProvider?.[provider]?.[providerId] || null;
    const item = sku ? map.bySku?.[sku] : null;
    return res.json({ ok: true, provider, providerId, sku, item });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "MAP_LOOKUP_PROVIDER_FAILED" });
  }
}

/**
 * ROTA 1 (Fornecedor -> Nexus):
 * você manda provider + providerProductId + sku + metadados
 * e isso “ativa” o item no seu sistema com vínculo 100% seguro.
 */
export function mapUpsert(req, res) {
  try {
    const body = req.body || {};
    const sku = String(body.sku || "").trim();
    const provider = String(body.provider || "").trim();
    const providerProductId = String(body.providerProductId || "").trim();

    if (!sku || !provider || !providerProductId) {
      return res.status(400).json({ ok: false, error: "sku/provider/providerProductId required" });
    }

    const map = readMap();

    if (!map.bySku) map.bySku = {};
    if (!map.byProvider) map.byProvider = {};
    if (!map.byProvider[provider]) map.byProvider[provider] = {};

    if (!map.bySku[sku]) {
      map.bySku[sku] = {
        title: body.title || "",
        category: body.category || "",
        brand: body.brand || "",
        providers: []
      };
    }

    const providers = Array.isArray(map.bySku[sku].providers) ? map.bySku[sku].providers : [];
    const exists = providers.find(p => p.provider === provider && p.providerProductId === providerProductId);

    if (!exists) {
      providers.push({
        provider,
        providerProductId,
        providerUrl: body.providerUrl || "",
        country: body.country || "",
        currency: body.currency || "USD",
        maxPriceBRL: body.maxPriceBRL ?? null
      });
      map.bySku[sku].providers = providers;
    }

    map.byProvider[provider][providerProductId] = sku;
    map.updatedAt = new Date().toISOString();

    writeMap(map);

    return res.json({ ok: true, sku, provider, providerProductId });
  } catch (e) {
    console.error("[MAP] upsert error:", e?.message || e);
    return res.status(500).json({ ok: false, error: "MAP_UPSERT_FAILED" });
  }
}
