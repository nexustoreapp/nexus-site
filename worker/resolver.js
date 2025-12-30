// ===================================================
// NEXUS — GENERIC PRODUCT RESOLVER (WORKER)
// Resolve produtos Syncee + Zendrop
// ===================================================

// ---------- UTIL ----------
function normalize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  return normalize(text)
    .split(" ")
    .filter(t => t.length > 2);
}

// Similaridade simples (Jaccard)
function similarityScore(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;

  if (!union) return 0;
  return intersection / union;
}

// ---------- CATEGORY GUARD ----------
function categoryMatch(nexusCategory, supplierText) {
  const map = {
    gpu: ["gpu", "graphics", "rtx", "rx", "geforce", "radeon"],
    cpu: ["cpu", "processor", "ryzen", "intel", "core"],
    storage: ["ssd", "hdd", "nvme", "storage"],
    ram: ["ram", "ddr", "memory"],
    peripherals: ["keyboard", "mouse", "headset", "monitor"],
  };

  const keys = map[nexusCategory] || [];
  const text = normalize(supplierText);

  return keys.some(k => text.includes(k));
}

// ===================================================
// CORE RESOLVER
// ===================================================

export async function resolveProduct({
  page,
  sku,
  category,
  title,
  supplier,
  supplierProductId,
}) {
  const titleTokens = tokenize(title);

  // 1️⃣ TENTA POR ID (se existir)
  if (supplierProductId) {
    const byId = await resolveById({ page, supplier, supplierProductId });
    if (byId) return byId;
  }

  // 2️⃣ BUSCA NO FORNECEDOR
  const results = await searchSupplier({ page, supplier, query: title });
  if (!results.length) return null;

  // 3️⃣ SCORE DE SIMILARIDADE
  let best = null;
  let bestScore = 0;

  for (const item of results) {
    if (!categoryMatch(category, item.title)) continue;

    const score = similarityScore(titleTokens, tokenize(item.title));
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  // 4️⃣ THRESHOLD DE SEGURANÇA
  if (!best || bestScore < 0.55) return null;

  // 5️⃣ ABRE PRODUTO FINAL
  return await openAndExtract({ page, supplier, item: best });
}

// ===================================================
// SUPPLIER GENERIC HANDLERS
// ===================================================

async function resolveById({ page, supplier, supplierProductId }) {
  try {
    if (supplier === "syncee") {
      await page.goto(
        `https://app.syncee.com/product/${supplierProductId}`,
        { waitUntil: "networkidle" }
      );
    }

    if (supplier === "zendrop") {
      await page.goto(
        `https://app.zendrop.com/products/${supplierProductId}`,
        { waitUntil: "networkidle" }
      );
    }

    return await extractProductData(page);
  } catch {
    return null;
  }
}

async function searchSupplier({ page, supplier, query }) {
  try {
    if (supplier === "syncee") {
      await page.goto("https://app.syncee.com/products", { waitUntil: "networkidle" });
    }

    if (supplier === "zendrop") {
      await page.goto("https://app.zendrop.com/products", { waitUntil: "networkidle" });
    }

    await page.fill("input[type=search]", query);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2000);

    return await page.$$eval(".product-card", cards =>
      cards.slice(0, 10).map(c => ({
        title: c.innerText,
        url: c.querySelector("a")?.href || null,
      }))
    );
  } catch {
    return [];
  }
}

async function openAndExtract({ page, supplier, item }) {
  try {
    if (item.url) {
      await page.goto(item.url, { waitUntil: "networkidle" });
    }
    return await extractProductData(page);
  } catch {
    return null;
  }
}

async function extractProductData(page) {
  try {
    const title = await page.$eval("h1", el => el.innerText);
    const priceText = await page.$eval(".price", el => el.innerText);
    const image = await page.$eval("img", el => el.src);

    const priceBRL = Number(
      priceText.replace(/[^\d,]/g, "").replace(",", ".")
    );

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