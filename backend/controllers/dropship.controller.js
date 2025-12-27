import crypto from "crypto";

// CJ endpoints (API 2.0)
const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const CJ_TOKEN_URL = `${CJ_BASE}/authentication/getAccessToken`;
const CJ_LIST_URL = `${CJ_BASE}/product/listV2`;

// ====== CONFIG ======
const CJ_API_KEY = process.env.CJ_API_KEY || ""; // coloque no Render
const USD_BRL = Number(process.env.USD_BRL || "5.0"); // ajuste no Render (ex: 5.10)

// “preço sempre baixo”: markup pequeno por plano
// você pode ajustar depois sem mexer no código (via Render env)
const MARKUP_FREE = Number(process.env.MARKUP_FREE || "0.06");   // 6%
const MARKUP_CORE = Number(process.env.MARKUP_CORE || "0.04");   // 4%
const MARKUP_HYPER = Number(process.env.MARKUP_HYPER || "0.02"); // 2%
const MARKUP_OMEGA = Number(process.env.MARKUP_OMEGA || "0.01"); // 1%

const rank = { free: 1, core: 2, hyper: 3, omega: 4 };

// ====== TOKEN CACHE ======
let tokenCache = {
  accessToken: "",
  expiryMs: 0,
  openId: null,
};

// CJ access token dura dias; a doc mostra “Default 15 days” :contentReference[oaicite:3]{index=3}
function tokenLooksValid() {
  return tokenCache.accessToken && Date.now() < tokenCache.expiryMs;
}

async function getCJAccessToken() {
  if (tokenLooksValid()) return tokenCache.accessToken;

  if (!CJ_API_KEY) {
    throw new Error("CJ_API_KEY_NOT_SET");
  }

  const r = await fetch(CJ_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: CJ_API_KEY }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok || data?.result !== true || !data?.data?.accessToken) {
    throw new Error(
      `CJ_TOKEN_FAILED ${r.status} ${data?.message || "unknown"}`
    );
  }

  const accessToken = data.data.accessToken;
  // guarda token por 12 dias (buffer). Não dependemos de parse de timezone.
  tokenCache = {
    accessToken,
    openId: data.data.openId ?? null,
    expiryMs: Date.now() + 12 * 24 * 60 * 60 * 1000,
  };

  return accessToken;
}

function normPlan(v) {
  const p = String(v || "free").toLowerCase().trim();
  return ["free", "core", "hyper", "omega"].includes(p) ? p : "free";
}

function computePriceBRL(usd, plan) {
  const base = Number(usd);
  if (!Number.isFinite(base)) return null;

  const brl = base * USD_BRL;

  let mk = MARKUP_FREE;
  if (plan === "core") mk = MARKUP_CORE;
  if (plan === "hyper") mk = MARKUP_HYPER;
  if (plan === "omega") mk = MARKUP_OMEGA;

  // preço “sempre baixo”: markup mínimo + arredonda bonito
  const final = brl * (1 + mk);
  return Math.round(final * 100) / 100;
}

// categoria CJ → sua categoria (bem básico; depois refinamos)
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

function buildCJProductUrl(id, sku) {
  // CJ listV2 retorna id e sku :contentReference[oaicite:4]{index=4}
  // Link “bom o suficiente” para abrir o produto no CJ:
  // (se você quiser o link exato de produto, usamos endpoint de detalhes depois)
  const q = encodeURIComponent(sku || id || "");
  return `https://cjdropshipping.com/search?search=${q}`;
}

function stableIdFromCJ(p) {
  const raw = `${p?.id || ""}|${p?.sku || ""}|cj`;
  return "cj-" + crypto.createHash("md5").update(raw).digest("hex").slice(0, 16);
}

export async function dropshipSearchController(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const plan = normPlan(req.query.plan);

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 60);

    if (!q) {
      return res.json({ ok: true, query: "", total: 0, page, limit, produtos: [] });
    }

    const token = await getCJAccessToken();

    // CJ listV2: page, size, keyWord :contentReference[oaicite:5]{index=5}
    const url = new URL(CJ_LIST_URL);
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", String(limit));
    url.searchParams.set("keyWord", q);
    url.searchParams.set("orderBy", "0"); // best match :contentReference[oaicite:6]{index=6}

    const r = await fetch(url.toString(), {
      headers: {
        "CJ-Access-Token": token,
      },
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok || data?.result !== true) {
      throw new Error(`CJ_SEARCH_FAILED ${r.status} ${data?.message || "unknown"}`);
    }

    const content = data?.data?.content?.[0]?.productList || [];
    // cada item tem bigImage e sellPrice em USD :contentReference[oaicite:7]{index=7}
    const produtos = content.map((p) => {
      const title = p?.nameEn || p?.sku || "Produto CJ";
      const brand = ""; // CJ nem sempre dá brand; depois buscamos detalhes se quiser
      const category = mapCategory(title);
      const image = p?.bigImage || null;

      const usd = p?.nowPrice || p?.sellPrice || p?.discountPrice || null;
      const priceOmega = computePriceBRL(usd, "omega");
      const priceHyper = computePriceBRL(usd, "hyper");
      const priceCore  = computePriceBRL(usd, "core");
      const priceFree  = computePriceBRL(usd, "free");

      // regra de “bloqueio por plano”:
      // free vê tudo, mas alguns itens podem ir premium depois (você decide)
      const tier = "free";

      return {
        id: stableIdFromCJ(p),
        supplierId: p?.id || null,
        sku: p?.sku || null,

        title,
        brand,
        category,

        // preços em BRL já “baixos” por plano
        pricePublic: priceFree,
        pricePremium: priceOmega,

        image,
        url: buildCJProductUrl(p?.id, p?.sku),

        source: "cj",
        tier,
      };
    });

    return res.json({
      ok: true,
      query: q,
      source: "cj",
      currencyBase: "USD",
      usd_brl: USD_BRL,
      page,
      limit,
      total: data?.data?.totalRecords ?? produtos.length,
      produtos,
    });
  } catch (e) {
    console.error("[DROPSHIP] erro:", e?.message || e);
    return res.status(500).json({ ok: false, error: "DROPSHIP_SEARCH_FAILED" });
  }
}
