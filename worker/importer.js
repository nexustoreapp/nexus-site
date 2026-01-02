import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parse } from "csv-parse";

// ========= CONFIG =========
const ICECAT_USER = process.env.ICECAT_USER;
const ICECAT_PASS = process.env.ICECAT_PASS;
const FEED_URL = "https://data.icecat.biz/export/freexml.int/INT/files.index.csv";
const MAX_PRODUCTS = Math.min(Number(process.env.MAX_PRODUCTS || 1200), 5000);
const CATALOG_DIR = path.resolve("backend/data/catalog");

if (!ICECAT_USER || !ICECAT_PASS) {
  throw new Error("ICECAT_USER ou ICECAT_PASS não definidos");
}

// ===== filtros (nicho eletrônicos / Kabum-like) =====
const TECH_WORDS = [
  "graphics","video","gpu","processor","cpu","memory","ram",
  "ssd","hdd","storage","motherboard","monitor","display",
  "keyboard","mouse","headset","microphone","power","psu",
  "laptop","notebook","desktop","router","switch","network"
];

// marcas conhecidas (usadas só quando existir brand)
const KNOWN_BRANDS = [
  "nvidia","amd","intel","asus","msi","gigabyte","asrock",
  "corsair","kingston","crucial","samsung","seagate","wd",
  "logitech","razer","hyperx","steelseries","redragon",
  "aoc","lg","dell","acer","hp","lenovo","tp-link","d-link"
];

const norm = s => String(s || "").toLowerCase();
const hasTech = s => TECH_WORDS.some(w => norm(s).includes(w));
const isKnownBrand = b => KNOWN_BRANDS.includes(norm(b));

function detectCategory(text) {
  const t = norm(text);
  if (t.includes("rtx") || t.includes("gtx") || t.includes("radeon")) return "gpu";
  if (t.includes("cpu") || t.includes("processor") || t.includes("ryzen")) return "cpu";
  if (t.includes("ram") || t.includes("ddr")) return "ram";
  if (t.includes("ssd") || t.includes("nvme") || t.includes("hdd")) return "storage";
  if (t.includes("motherboard")) return "motherboard";
  if (t.includes("monitor") || t.includes("display")) return "monitor";
  if (t.includes("psu") || t.includes("power supply")) return "power";
  if (t.includes("router") || t.includes("switch") || t.includes("network")) return "network";
  if (t.includes("keyboard") || t.includes("mouse") || t.includes("headset")) return "peripherals";
  return null;
}

function readJson(p, fallback = []) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : fallback;
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function upsert(list, item) {
  const idx = list.findIndex(x => x.sku === item.sku);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...item, updatedAt: Date.now() };
    return false;
  }
  list.push({ ...item, createdAt: Date.now(), updatedAt: Date.now() });
  return true;
}

async function main() {
  console.log("[IMPORTER] Iniciando import ICECAT (stream tolerante)...");
  ensureDir(CATALOG_DIR);

  const auth = Buffer.from(`${ICECAT_USER}:${ICECAT_PASS}`).toString("base64");
  const res = await fetch(FEED_URL, {
    headers: { Authorization: `Basic ${auth}` }
  });

  if (!res.ok) {
    throw new Error(`ICECAT ${res.status}`);
  }

  let added = 0;
  let processed = 0;

  const parser = res.body.pipe(parse({
    columns: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_records_with_error: true,
    from_line: 2
  }));

  for await (const row of parser) {
    if (added >= MAX_PRODUCTS) break;

    const title = row.ProductName || row.Title || "";
    const brand = row.Brand || row.Supplier || "";
    const catName = row.CatName || "";

    // mantém SOMENTE nicho técnico
    if (!hasTech(title) && !hasTech(catName)) continue;

    const category = detectCategory(`${title} ${catName}`);
    if (!category) continue;

    // 🔥 REGRA NOVA:
    // - se NÃO tiver marca → aceita
    // - se TIVER marca → aceita qualquer marca (não bloqueia mais)
    // (marca será refinada depois)
    const mpn = row.Prod_ID || row.MPN || "";
    const ean = row.EAN || row.UPC || "";

    const skuBase = (mpn || ean || title).slice(0, 80);
    const sku = `${category}-${skuBase}`
      .replace(/[^a-zA-Z0-9\-_]/g, "-")
      .toLowerCase();

    const item = {
      sku,
      title,
      category,
      brand: brand || "generic",
      mpn,
      ean,
      price: null,
      stock: null,
      image: "fallback.png",
      source: "icecat"
    };

    const filePath = path.join(CATALOG_DIR, `${category}.json`);
    const list = readJson(filePath, []);
    if (upsert(list, item)) {
      writeJson(filePath, list);
      added++;
    }

    processed++;
    if (processed % 500 === 0) {
      console.log(`[IMPORTER] Processados ${processed}, adicionados ${added}`);
    }
  }

  console.log(`[IMPORTER] Finalizado. Adicionados=${added}`);
}

main().catch(err => {
  console.error("[IMPORTER] ERRO:", err.message);
  process.exit(1);
});