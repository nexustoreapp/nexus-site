import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const MAP_PATH = path.join(DATA_DIR, "supplier_map.json");
const RULES_PATH = path.join(DATA_DIR, "robot_rules.json");
const ORDERS_PATH = path.join(DATA_DIR, "orders.json");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}
function nowIso() {
  return new Date().toISOString();
}
function safeNorm(v) {
  return String(v ?? "").trim();
}

function genId(prefix = "ord") {
  return `${prefix}-${crypto.randomBytes(8).toString("hex")}`;
}

function loadMap() {
  if (!fs.existsSync(MAP_PATH)) {
    throw new Error("SUPPLIER_MAP_NOT_FOUND");
  }
  return readJson(MAP_PATH);
}

function loadRules() {
  if (!fs.existsSync(RULES_PATH)) {
    throw new Error("ROBOT_RULES_NOT_FOUND");
  }
  return readJson(RULES_PATH);
}

function loadOrders() {
  if (!fs.existsSync(ORDERS_PATH)) {
    writeJson(ORDERS_PATH, { version: 1, orders: [] });
  }
  return readJson(ORDERS_PATH);
}

function saveOrders(data) {
  writeJson(ORDERS_PATH, data);
}

// --- “clients” (placeholders): por enquanto não compram de verdade.
// Quando você tiver API do Syncee/Zendrop, a gente implementa aqui.
async function quoteFromProvider(provider, providerProductId) {
  // TODO: integrar API real do provider (Syncee/Zendrop).
  // Por enquanto, retorna "unknown" e força exceção se precisar.
  return {
    ok: false,
    provider,
    providerProductId,
    reason: "NO_PROVIDER_API_CONNECTED"
  };
}

function priceToBRL(value, currency, USD_BRL) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  if ((currency || "").toUpperCase() === "USD") return Math.round(n * USD_BRL * 100) / 100;
  if ((currency || "").toUpperCase() === "BRL") return Math.round(n * 100) / 100;

  // sem suporte
  return null;
}

function computePlanPrice(baseBRL, plan, markupCfg) {
  const mk = Number(markupCfg?.[plan] ?? 0.06);
  const v = baseBRL * (1 + mk);
  return Math.round(v * 100) / 100;
}

function decideSupplier({ sku, plan, customerCountry }) {
  const map = loadMap();
  const rules = loadRules();

  const item = map.bySku?.[sku];
  if (!item) {
    return {
      ok: false,
      decision: "BLOCK",
      reason: "MAPPING_MISSING",
      sku
    };
  }

  const providers = Array.isArray(item.providers) ? item.providers : [];
  if (!providers.length) {
    return {
      ok: false,
      decision: "BLOCK",
      reason: "NO_PROVIDERS_FOR_SKU",
      sku
    };
  }

  // Filtra por providers permitidos
  const allow = new Set(rules.autopilot?.allowProviders || []);
  const candidates = providers.filter(p => allow.has(p.provider) && p.providerProductId);

  if (!candidates.length) {
    return {
      ok: false,
      decision: "BLOCK",
      reason: "NO_ALLOWED_PROVIDER",
      sku
    };
  }

  // Se exigir envio para o país do cliente, só valida na cotação real (API).
  // Por enquanto, a regra existe mas será aplicada quando o provider API estiver conectado.
  return {
    ok: true,
    decision: "CANDIDATE_SELECTED",
    sku,
    plan,
    customerCountry,
    candidates
  };
}

async function robotProcessOrder(orderInput) {
  const rules = loadRules();
  const map = loadMap();

  const sku = safeNorm(orderInput?.sku);
  const plan = safeNorm(orderInput?.plan || "free").toLowerCase();
  const qty = Math.max(parseInt(orderInput?.qty || "1", 10), 1);

  const customer = orderInput?.customer || {};
  const customerCountry = safeNorm(customer.country || "BR");

  if (!sku) {
    return { ok: false, status: "REJECTED", reason: "SKU_REQUIRED" };
  }

  const decision = decideSupplier({ sku, plan, customerCountry });
  if (!decision.ok) {
    return { ok: false, status: "REJECTED", ...decision };
  }

  const item = map.bySku[sku];
  const USD_BRL = Number(rules.currency?.USD_BRL || 5.0);

  // tenta cotar em cada candidato (quando tiver API, isso vira real)
  const quoteAttempts = [];
  for (const c of decision.candidates) {
    const q = await quoteFromProvider(c.provider, c.providerProductId);
    quoteAttempts.push({ ...c, quote: q });
  }

  // sem API = vira exceção automática (mas sem comprar errado)
  const hasAnyOkQuote = quoteAttempts.some(a => a.quote?.ok === true);
  if (!hasAnyOkQuote) {
    // cria pedido interno em “EXCEPTION” pra você ver no painel
    const ordersDb = loadOrders();
    const id = genId("ord");

    const entry = {
      id,
      createdAt: nowIso(),
      status: "EXCEPTION",
      reason: "NO_PROVIDER_API_CONNECTED",
      sku,
      qty,
      plan,
      customer,
      mapping: item,
      attempts: quoteAttempts
    };

    ordersDb.orders.unshift(entry);
    saveOrders(ordersDb);

    return { ok: true, status: "EXCEPTION", orderId: id, reason: entry.reason };
  }

  // quando tiver API: escolher melhor preço, validar limite e criar pedido automático.
  // (deixo a estrutura pronta agora)
  const best = quoteAttempts
    .filter(a => a.quote?.ok)
    .sort((a, b) => (a.quote.total || 1e18) - (b.quote.total || 1e18))[0];

  const maxPriceBRL = Number(item?.providers?.[0]?.maxPriceBRL || rules.price?.defaultMaxPriceBRL || 2000);

  const supplierPriceBRL = priceToBRL(best.quote.total, best.quote.currency || "USD", USD_BRL);

  if (!supplierPriceBRL || supplierPriceBRL > maxPriceBRL) {
    const ordersDb = loadOrders();
    const id = genId("ord");

    const entry = {
      id,
      createdAt: nowIso(),
      status: "EXCEPTION",
      reason: "PRICE_OVER_LIMIT_OR_UNKNOWN",
      sku,
      qty,
      plan,
      customer,
      supplierQuote: best,
      maxPriceBRL
    };

    ordersDb.orders.unshift(entry);
    saveOrders(ordersDb);

    return { ok: true, status: "EXCEPTION", orderId: id, reason: entry.reason };
  }

  const pricePublic = computePlanPrice(supplierPriceBRL, "free", rules.price?.planMarkup);
  const pricePremium = computePlanPrice(supplierPriceBRL, "omega", rules.price?.planMarkup);

  const ordersDb = loadOrders();
  const id = genId("ord");

  const entry = {
    id,
    createdAt: nowIso(),
    status: "PLACED",
    sku,
    qty,
    plan,
    customer,
    supplier: {
      provider: best.provider,
      providerProductId: best.providerProductId,
      quote: best.quote
    },
    price: {
      supplierPriceBRL,
      pricePublic,
      pricePremium
    }
  };

  ordersDb.orders.unshift(entry);
  saveOrders(ordersDb);

  return { ok: true, status: "PLACED", orderId: id };
}

export const robotManager = {
  decideSupplier,
  robotProcessOrder,
  loadOrders,
  loadMap,
  loadRules
};
