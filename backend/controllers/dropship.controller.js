import crypto from "crypto";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const CJ_TOKEN_URL = `${CJ_BASE}/authentication/getAccessToken`;
const CJ_LIST_URL = `${CJ_BASE}/product/listV2`;

const CJ_API_KEY = process.env.CJ_API_KEY || "";
const USD_BRL = Number(process.env.USD_BRL || "5.0");

const MARKUP_FREE = Number(process.env.MARKUP_FREE || "0.06");
const MARKUP_CORE = Number(process.env.MARKUP_CORE || "0.04");
const MARKUP_HYPER = Number(process.env.MARKUP_HYPER || "0.02");
const MARKUP_OMEGA = Number(process.env.MARKUP_OMEGA || "0.01");

let tokenCache = { accessToken: "", expiryMs: 0 };

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

function normPlan(v) {
  const p = String(v || "free").toLowerCase().trim();
  return ["free", "core", "hyper", "omega"].includes(p) ? p : "free";
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
    p?.bigImg ||
    p?.mainImage ||
    p?.mainImg ||
    p?.productImage ||
    p?.productImg ||
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

function mapCategory(title) {
  const t = String(title || "").toLowerCase();
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
  if (t.includes("cpu") || t.includes("processor") || t.includes("ryzen") || t.includes("intel")) return "CPU";
  if (t.includes("gpu") || t.includes("rtx") || t.includes("gtx") || t.includes("radeon")) return "GPU";
  return "Acessórios";
}

// pega a lista independente do formato (CJ muda isso)
function extractList(payload) {
  const d = payload?.data;

  // formatos comuns
  const a = d?.content?.[0]?.productList;
  if (Array.isArray(a)) return a;

  const b = d?.content?.productList;
  if (Array.isArray(b)) return b;

  const c = d?.productList;
  if (Array.isArray(c)) return c;

  // às vezes content é array de produtos direto
  const e = d?.content;
  if (Array.isArray(e)) return e;

  return [];
}

export async function dropshipSearchController(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const plan = normPlan(req.query.plan);

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 60);

    const debug = String(req.query.debug || "") === "1";

    if (!q) {
      return res.json({ ok: true, query: "", total: 0, page, limit, produtos: [] });
    }

    const token = await getCJAccessToken();

    const url = new URL(CJ_LIST_URL);
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", String(limit));
    url.searchParams.set("keyWord", q);
    url.searchParams.set("orderBy", "0");

    const r = await fetch(url.toString(), { headers: { "CJ-Access-Token": token } });
    const payload = await r.json().catch(() => ({}));

    if (!r.ok || payload?.result !== true) {
      return res.status(500).json({
        ok: false,
        error: "CJ_SEARCH_FAILED",
        status: r.status,
        message: payload?.message || "unknown",
      });
    }

    const list = extractList(payload);
    const sample = list[0] || null;

    const produtos = list.map((p) => {
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
        priceCore: computePriceBRL(usd, "core"),
        priceHyper: computePriceBRL(usd, "hyper"),
        pricePremium: computePriceBRL(usd, "omega"),

        image: pickImage(p),
        url: buildCJProductUrl(p?.id || p?.productId, p?.sku),

        source: "cj",
        tier: "free",
      };
    });

    // DEBUG: mostra o “CJ cru” + chaves do primeiro item
    if (debug) {
      return res.json({
        ok: true,
        debug: true,
        query: q,
        gotItems: list.length,
        sampleKeys: sample ? Object.keys(sample) : [],
        sampleRaw: sample,
        sampleParsed: produtos[0] || null,
      });
    }

    return res.json({
      ok: true,
      query: q,
      source: "cj",
      usd_brl: USD_BRL,
      page,
      limit,
      total: payload?.data?.totalRecords ?? produtos.length,
      produtos,
    });
  } catch (e) {
    console.error("[DROPSHIP] erro:", e?.message || e);
    return res.status(500).json({ ok: false, error: "DROPSHIP_SEARCH_FAILED" });
  }
}
