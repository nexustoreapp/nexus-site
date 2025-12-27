import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const CJ_TOKEN_URL = `${CJ_BASE}/authentication/getAccessToken`;
const CJ_LIST_URL = `${CJ_BASE}/product/listV2`;

const CJ_API_KEY = process.env.CJ_API_KEY || "";
const USD_BRL = Number(process.env.USD_BRL || "5.0");

const MARKUP_FREE = Number(process.env.MARKUP_FREE || "0.06");
const MARKUP_CORE = Number(process.env.MARKUP_CORE || "0.04");
const MARKUP_HYPER = Number(process.env.MARKUP_HYPER || "0.02");
const MARKUP_OMEGA = Number(process.env.MARKUP_OMEGA || "0.01");

/**
 * Você controla o que “você vende” aqui:
 * - ALLOW: palavras que obrigatoriamente devem bater (pelo menos 1)
 * - BLOCK: palavras proibidas (se bater, some)
 *
 * Ajuste depois com calma, mas já te entrego forte.
 */
const ALLOW_KEYWORDS = [
  // Hardware / PC
  "cpu","processor","intel","amd","ryzen","core i",
  "gpu","rtx","gtx","radeon","graphics card","video card",
  "motherboard","mainboard","placa mae","b450","b550","b660","x570","z690",
  "ram","ddr4","ddr5","memory",
  "ssd","nvme","m.2","hard drive","hdd",
  "psu","power supply","fonte","650w","750w","850w",
  "case","gabinete","mid tower","full tower",
  "cooler","water cooler","aio","fan",

  // Periféricos
  "keyboard","teclado","mouse","mousepad","headset","webcam","microphone","microfone","speaker","caixa de som",

  // Display
  "monitor","tv","smart tv","oled","qled","projector","projetor",

  // Mobile
  "smartphone","iphone","galaxy","redmi","xiaomi","motorola","tablet","ipad","smartwatch","watch","mi band",

  // Rede
  "router","roteador","wifi","mesh","ethernet","network card","placa de rede","bluetooth",

  // Console
  "ps5","ps4","xbox","nintendo","switch","controller","controle","gamepad"
];

// Coisas que você NÃO quer vender (bloqueia na cara)
const BLOCK_KEYWORDS = [
  // Adulto / conteúdo que você não quer no marketplace
  "sex", "sexy", "lingerie", "adult", "toy", "condom",

  // Cosmético / moda (se você não quer)
  "dress", "shirt", "shoe", "fashion", "makeup",

  // Coisas aleatórias comuns no CJ
  "pet", "dog", "cat", "baby", "kids", "kitchen", "furniture",
  "hair", "wig", "nail", "jewelry", "necklace"
];

let tokenCache = { accessToken: "", expiryMs: 0 };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CATALOG_DIR = path.join(__dirname, "..", "data", "catalog");
const INDEX_PATH = path.join(CATALOG_DIR, "index.json");

// ======= utils =======
function norm(v) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tokenize(q) {
  return norm(q).split(/\s+/).filter(Boolean);
}

function parseMoney(v) {
  if (v == null) return null;
  const s = String(v).replace(",", ".");
  const m = s.match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function computePriceBRL(usdValue, plan) {
  const usd = parseMoney(usdValue);
  if (!Number.isFinite(usd)) return null;

  let mk = MARKUP_FREE;
  if (plan === "core") mk = MARKUP_CORE;
  if (plan === "hyper") mk = MARKUP_HYPER;
  if (plan === "omega") mk = MARKUP_OMEGA;

  const final = usd * USD_BRL * (1 + mk);
  return Math.round(final * 100) / 100;
}

function pickImage(p) {
  return (
    p?.bigImage ||
    p?.mainImage ||
    p?.productImage ||
    p?.img ||
    p?.image ||
    null
  );
}

function buildCJProductUrl(id, sku) {
  const q = encodeURIComponent(sku || id || "");
  return `https://cjdropshipping.com/search?search=${q}`;
}

function stableIdFromCJ(p) {
  const raw = `${p?.id || ""}|${p?.productId || ""}|${p?.sku || ""}|cj`;
  return "cj-" + crypto.createHash("md5").update(raw).digest("hex").slice(0, 16);
}

function tokenValid() {
  return tokenCache.accessToken && Date.now() < tokenCache.expiryMs;
}

async function getCJAccessToken() {
  if (tokenValid()) return tokenCache.accessToken;
  if (!CJ_API_KEY) throw new Error("CJ_API_KEY_NOT_SET");

  const r = await fetch(CJ_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: CJ_API_KEY }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.result !== true || !data?.data?.accessToken) {
    throw new Error(`CJ_TOKEN_FAILED ${r.status} ${data?.message || "unknown"}`);
  }

  tokenCache = {
    accessToken: data.data.accessToken,
    expiryMs: Date.now() + 12 * 24 * 60 * 60 * 1000,
  };

  return tokenCache.accessToken;
}

// CJ pode mudar formato: pega lista de qualquer jeito
function extractList(payload) {
  const d = payload?.data;
  const a = d?.content?.[0]?.productList;
  if (Array.isArray(a)) return a;

  const b = d?.productList;
  if (Array.isArray(b)) return b;

  const c = d?.content;
  if (Array.isArray(c)) return c;

  return [];
}

// ======= Filtro do que você vende =======
function isBlocked(text) {
  const t = norm(text);
  return BLOCK_KEYWORDS.some(k => t.includes(norm(k)));
}

function isAllowed(text) {
  const t = norm(text);
  return ALLOW_KEYWORDS.some(k => t.includes(norm(k)));
}

function mapCategory(title) {
  const t = norm(title);
  if (t.includes("keyboard") || t.includes("teclado")) return "Teclado";
  if (t.includes("mousepad")) return "Mousepad";
  if (t.includes("mouse")) return "Mouse";
  if (t.includes("headset") || t.includes("fone")) return "Headset";
  if (t.includes("webcam")) return "Webcam";
  if (t.includes("monitor")) return "Monitor";
  if (t.includes("tv")) return "TV";
  if (t.includes("ssd")) return "SSD";
  if (t.includes("hdd") || t.includes("hard drive")) return "HDD";
  if (t.includes("router") || t.includes("roteador") || t.includes("wifi")) return "Roteador";
  if (t.includes("cpu") || t.includes("processor") || t.includes("ryzen") || t.includes("intel") || t.includes("core i")) return "CPU";
  if (t.includes("gpu") || t.includes("rtx") || t.includes("gtx") || t.includes("radeon") || t.includes("video card")) return "GPU";
  return "Acessórios";
}

// ======= fallback catálogo local (quando CJ não tem) =======
function loadLocalCatalog() {
  if (!fs.existsSync(INDEX_PATH)) return [];
  const idx = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
  const cats = Array.isArray(idx?.categories) ? idx.categories : [];

  let out = [];
  for (const c of cats) {
    if (!c?.file) continue;
    const fp = path.join(CATALOG_DIR, c.file);
    if (!fs.existsSync(fp)) continue;
    const raw = JSON.parse(fs.readFileSync(fp, "utf8"));
    const items = Array.isArray(raw) ? raw : (raw.products || []);
    if (Array.isArray(items)) out.push(...items);
  }
  return out;
}

function localSearch(localCatalog, qTokens) {
  if (!qTokens.length) return [];
  return localCatalog.filter(p => {
    const hay = norm(`${p.title} ${p.brand} ${p.category} ${(p.tags||[]).join(" ")}`);
    return qTokens.every(t => hay.includes(t));
  });
}

export async function dropshipSearchController(req, res) {
  try {
    const qRaw = String(req.query.q || "").trim();
    const qTokens = tokenize(qRaw);

    const plan = String(req.query.plan || "free").toLowerCase().trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 60);

    if (!qRaw) {
      return res.json({ ok: true, query: "", total: 0, page, limit, produtos: [] });
    }

    // 1) busca CJ
    const token = await getCJAccessToken();

    const url = new URL(CJ_LIST_URL);
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", String(limit));
    url.searchParams.set("keyWord", qRaw);
    url.searchParams.set("orderBy", "0");

    const r = await fetch(url.toString(), { headers: { "CJ-Access-Token": token } });
    const payload = await r.json().catch(() => ({}));

    let cjList = [];
    if (r.ok && payload?.result === true) {
      cjList = extractList(payload);
    }

    // 2) filtra o que você vende (ALLOW + BLOCK)
    let cjFiltered = cjList
      .map(p => {
        const title = p?.nameEn || p?.name || p?.productName || p?.sku || "Produto CJ";
        const text = `${title} ${p?.brandName || ""} ${p?.sku || ""}`;
        return { raw: p, title, text };
      })
      .filter(x => !isBlocked(x.text))
      .filter(x => isAllowed(x.text))
      .map(x => x.raw);

    // 3) parse
    const produtosCJ = cjFiltered.map((p) => {
      const title = p?.nameEn || p?.name || p?.productName || p?.sku || "Produto CJ";

      const usd =
        p?.nowPrice ??
        p?.sellPrice ??
        p?.discountPrice ??
        p?.price ??
        p?.minPrice ??
        null;

      return {
        id: stableIdFromCJ(p),
        supplierId: p?.id || p?.productId || null,
        sku: p?.sku || null,

        title,
        brand: p?.brandName || p?.brand || "",
        category: mapCategory(title),

        pricePublic: computePriceBRL(usd, "free"),
        pricePremium: computePriceBRL(usd, "omega"),

        image: pickImage(p),
        url: buildCJProductUrl(p?.id || p?.productId, p?.sku),

        source: "cj",
        tier: "free"
      };
    });

    // 4) Se CJ não retornou nada útil, usa fallback local
    let produtos = produtosCJ;

    if (!produtos.length) {
      const local = loadLocalCatalog();
      const localHits = localSearch(local, qTokens).slice(0, limit);

      // local não tem imagem/preço, mas pelo menos mostra o item que você quer
      produtos = localHits.map(p => ({
        ...p,
        source: "local",
        pricePublic: p.pricePublic ?? p.price ?? null,
        pricePremium: p.pricePremium ?? p.price ?? null,
        image: p.image ?? null,
        url: p.url ?? null
      }));
    }

    return res.json({
      ok: true,
      query: qRaw,
      page,
      limit,
      total: produtos.length,
      produtos
    });

  } catch (e) {
    console.error("[DROPSHIP] erro:", e?.message || e);
    return res.status(500).json({ ok: false, error: "DROPSHIP_SEARCH_FAILED" });
  }
}
