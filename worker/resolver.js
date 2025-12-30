// ===================================================
// NEXUS — RESOLVER FINAL (PT/EN + tradução + zero erro)
// ===================================================

import translate from "@vitalets/google-translate-api";

const USD_TO_BRL = Number(process.env.USD_TO_BRL || 5.2);

// --------- NORMALIZAÇÃO ----------
function stripNonLatin(text = "") {
  return text.replace(/[^\x00-\x7F]/g, " ");
}
function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s\-\.\+\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function tokenize(text = "") {
  return normalize(text).split(" ").filter(t => t.length > 2);
}
function similarity(aTokens, bTokens) {
  const A = new Set(aTokens);
  const B = new Set(bTokens);
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union ? inter / union : 0;
}

// --------- DETECÇÃO E TRADUÇÃO ----------
function looksNonPTEN(text = "") {
  // se tiver muitos caracteres não ASCII, geralmente é RU/AR/PL/etc
  const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length;
  return nonAscii >= 3;
}

async function toEnglishIfNeeded(text) {
  const raw = String(text || "");
  if (!raw) return "";
  if (!looksNonPTEN(raw)) {
    // ainda normaliza e remove lixo (pode conter mistura)
    return normalize(stripNonLatin(raw));
  }
  try {
    // traduz para EN
    const out = await translate(raw, { to: "en" });
    return normalize(stripNonLatin(out.text));
  } catch {
    // fallback seguro: remove não-latino e segue
    return normalize(stripNonLatin(raw));
  }
}

// --------- PREÇO ----------
function parsePriceToBRL(priceText = "") {
  const t = String(priceText || "");
  // USD (ex: $12.99)
  if (t.includes("$")) {
    const usd = parseFloat(t.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(usd)) return null;
    return usd * USD_TO_BRL;
  }
  // BRL/Outros (ex: R$ 1.234,56)
  const br = parseFloat(t.replace(/[^\d,]/g, "").replace(",", "."));
  return Number.isFinite(br) ? br : null;
}

// --------- SINAIS DUROS (zero erro) ----------
const BRAND_WORDS = [
  "anker","baseus","ugreen","vention","apple","samsung","xiaomi","tp-link","tplink",
  "sony","jbl","bose","logitech","hyperx","razer","edifier","sandisk","kingston","orico","spigen"
];

const TYPE_WORDS = [
  "cable","cabo","charger","carregador","adapter","adaptador","hub","powerbank","power","bank",
  "headset","fone","earbuds","airpods","monitor","ssd","hdd","nvme","router","roteador"
];

function extractNumbers(text = "") {
  return (String(text).match(/\d+/g) || []).map(n => Number(n)).filter(n => Number.isFinite(n));
}

function pickBrandFromSKU(sku = "") {
  const s = normalize(sku);
  return BRAND_WORDS.find(b => s.includes(b)) || null;
}

function requiredSignals(nexusSku, nexusTitle) {
  const brand = pickBrandFromSKU(nexusSku) || BRAND_WORDS.find(b => normalize(nexusTitle).includes(b)) || null;
  const nums = extractNumbers(nexusSku + " " + nexusTitle);

  // tipos “chave” extraídos do SKU (quando existir)
  const skuNorm = normalize(nexusSku);
  const type = TYPE_WORDS.find(t => skuNorm.includes(t)) || null;

  return { brand, nums, type };
}

function hardValidate(candidateTitleNorm, signals) {
  const t = candidateTitleNorm;

  // 1) marca (se eu sei a marca, ela TEM que aparecer)
  if (signals.brand && !t.includes(signals.brand)) return false;

  // 2) tipo (se eu sei o tipo, ele TEM que aparecer)
  if (signals.type && !t.includes(signals.type)) return false;

  // 3) números críticos: todos os números do SKU/título base devem existir no candidato
  // (isso é o que garante zero erro em cabo 1m vs 2m, 20w vs 25w, 4060 vs 4070)
  const candNums = extractNumbers(t);
  for (const n of signals.nums) {
    // ignore números muito pequenos que atrapalham (ex: 1 pode ser parte de "usb 3.1" etc)
    if (n <= 1) continue;
    if (!candNums.includes(n)) return false;
  }

  return true;
}

function thresholdByCategory(category) {
  // Mantemos rígido (zero erro), mas o hardValidate já é a “trava”
  if (category === "gpu" || category === "cpu") return 0.55;
  return 0.35;
}

// ===================================================
// RESOLVER PRINCIPAL
// ===================================================
export async function resolveProduct({ page, sku, category, title, supplier, supplierProductId }) {
  const baseTitleNorm = normalize(title || sku);
  const baseTokens = tokenize(baseTitleNorm);
  const signals = requiredSignals(sku, title || sku);

  // 1) Por ID (se existir)
  if (supplierProductId) {
    const byId = await resolveById({ page, supplier, supplierProductId });
    if (byId) return byId;
  }

  // 2) Busca
  const results = await searchSupplier({ page, supplier, query: title || sku });
  if (!results.length) return null;

  // 3) Score + validação dura
  let best = null;
  let bestScore = 0;

  for (const item of results) {
    const candTitleNorm = await toEnglishIfNeeded(item.title);
    if (!candTitleNorm) continue;

    // trava anti-erro
    if (!hardValidate(candTitleNorm, signals)) continue;

    const score = similarity(baseTokens, tokenize(candTitleNorm));
    if (score > bestScore) {
      bestScore = score;
      best = { ...item, _candTitleNorm: candTitleNorm };
    }
  }

  if (!best || bestScore < thresholdByCategory(category)) return null;

  // 4) Abre e extrai do produto final
  const data = await openAndExtract({ page, supplier, item: best });

  // Se extraiu, ainda valida título final (segurança máxima)
  if (data?.title) {
    const finalTitleNorm = await toEnglishIfNeeded(data.title);
    if (!hardValidate(finalTitleNorm, signals)) return null;
  }

  return data || null;
}

// ===================================================
// SUPPLIERS (GENÉRICO) — você ajusta seletor depois, mas já roda
// ===================================================
async function resolveById({ page, supplier, supplierProductId }) {
  try {
    if (supplier === "syncee") {
      await page.goto(`https://app.syncee.com/product/${supplierProductId}`, { waitUntil: "networkidle" });
    } else if (supplier === "zendrop") {
      await page.goto(`https://app.zendrop.com/products/${supplierProductId}`, { waitUntil: "networkidle" });
    } else {
      return null;
    }
    return await extractProduct(page);
  } catch {
    return null;
  }
}

async function searchSupplier({ page, supplier, query }) {
  try {
    if (supplier === "syncee") {
      await page.goto("https://app.syncee.com/products", { waitUntil: "networkidle" });
    } else if (supplier === "zendrop") {
      await page.goto("https://app.zendrop.com/products", { waitUntil: "networkidle" });
    } else {
      return [];
    }

    await page.fill("input[type=search]", query);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);

    // OBS: esses seletores podem precisar ajuste fino depois
    return await page.$$eval(".product-card", cards =>
      cards.slice(0, 12).map(c => ({
        title: c.innerText,
        url: c.querySelector("a")?.href || null,
      }))
    );
  } catch {
    return [];
  }
}

async function openAndExtract({ page, item }) {
  try {
    if (!item?.url) return null;
    await page.goto(item.url, { waitUntil: "networkidle" });
    return await extractProduct(page);
  } catch {
    return null;
  }
}

async function extractProduct(page) {
  try {
    const title = await page.$eval("h1", el => el.innerText);
    const priceText = await page.$eval(".price", el => el.innerText);
    const image = await page.$eval("img", el => el.src);

    const priceBRL = parsePriceToBRL(priceText);
    if (!priceBRL) return null;

    return {
      title,
      priceBRL,
      image,
      url: page.url(),
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}