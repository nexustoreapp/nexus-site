/**
 * build_catalogo_real.js
 * Uso:
 *   node backend/tools/build_catalogo_real.js --out backend/data/catalogo.json --limit 40000
 * Requer:
 *   npm i csv-parse
 */

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const args = process.argv.slice(2);
const getArg = (k, def = null) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : def;
};

const OUT = getArg("--out", "backend/data/catalogo.json");
const LIMIT = Number(getArg("--limit", "40000"));
const DATASETS_DIR = path.resolve("datasets");

const rank = { free: 1, core: 2, hyper: 3, omega: 4 };

// ============ util ============
function slugify(s = "") {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function safeStr(v) {
  return String(v ?? "").trim();
}

function inferCategory(raw = "") {
  const s = safeStr(raw).toLowerCase();

  if (s.match(/headset|headphone|fone|microfone.*headset/)) return "Headset";
  if (s.match(/keyboard|teclad/)) return "Teclado";
  if (s.match(/mouse/)) return "Mouse";
  if (s.match(/monitor|display/)) return "Monitor";
  if (s.match(/ssd|nvme/)) return "SSD";
  if (s.match(/ram|memory|ddr/)) return "Memória RAM";
  if (s.match(/cpu|processor|ryzen|core i[3579]/)) return "Processador";
  if (s.match(/gpu|graphics|geforce|radeon|rtx|gtx/)) return "Placa de Vídeo";
  if (s.match(/notebook|laptop/)) return "Notebook";
  if (s.match(/router|roteador|wi-?fi/)) return "Roteador";
  if (s.match(/webcam|camera/)) return "Webcam";
  if (s.match(/controller|controle|gamepad/)) return "Controle";
  if (s.match(/speaker|caixa de som|soundbar/)) return "Caixa de Som";
  if (s.match(/power supply|psu|fonte/)) return "Fonte";
  if (s.match(/case|gabinete/)) return "Gabinete";
  if (s.match(/cooler|water cooler|aio/)) return "Cooler";
  if (s.match(/vr|virtual reality|quest|psvr/)) return "VR";
  if (s.match(/storage|micro ?sd|sd card|external|externo|hdd/)) return "Armazenamento";

  return "Acessórios";
}

function tierForProduct(p) {
  // regra simples: free maioria, e “premium” pra itens mais caros/categoria premium
  // você pode refinar depois
  const cat = (p.category || "").toLowerCase();
  const title = (p.title || "").toLowerCase();

  if (cat.includes("placa de vídeo") || title.match(/rtx 4080|rtx 4090|7900 xtx/)) return "omega";
  if (cat.includes("notebook") || title.match(/rtx 4070|rtx 4070 ti|i7|ryzen 7|x3d/)) return "hyper";
  if (title.match(/pro|elite|ultra|max|mk\.?2|xt|super/)) return "core";
  return "free";
}

function buildTags(title, brand, category) {
  const base = `${title} ${brand} ${category}`.toLowerCase();
  const words = base
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3)
    .slice(0, 12);
  return Array.from(new Set([category.toLowerCase(), brand.toLowerCase(), ...words])).slice(0, 12);
}

function priceHeuristic(title, category) {
  // heurística simples (você depois ajusta com “preço menor que mercado”)
  const c = category.toLowerCase();
  let base = 199.9;

  if (c.includes("placa de vídeo")) base = 1699.9;
  else if (c.includes("notebook")) base = 4299.9;
  else if (c.includes("monitor")) base = 999.9;
  else if (c.includes("processador")) base = 899.9;
  else if (c.includes("ssd")) base = 399.9;
  else if (c.includes("memória")) base = 299.9;
  else if (c.includes("headset")) base = 449.9;
  else if (c.includes("teclado")) base = 299.9;
  else if (c.includes("mouse")) base = 229.9;

  // pequenos ajustes por “palavras premium”
  const t = title.toLowerCase();
  if (t.match(/pro|elite|max|ultra|super|xt|ti/)) base *= 1.15;
  if (t.match(/wireless|lightspeed|bluetooth/)) base *= 1.10;

  const pricePublic = Math.round(base * 100) / 100;
  const pricePremium = Math.round((base * 0.92) * 100) / 100;

  return { pricePublic, pricePremium };
}

// ============ load CSVs ============
function loadAnyCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
  });
  return records;
}

function pickField(row, keys) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
}

function normalizeRow(row) {
  // tenta “adivinhar” campos comuns de datasets
  const title = pickField(row, ["title", "name", "product_name", "productName", "asins_title"]);
  const brand = pickField(row, ["brand", "manufacturer", "brand_name", "brandName"]);
  const categoryRaw = pickField(row, ["category", "categories", "primary_category", "type"]);

  if (!title || title.length < 4) return null;

  const category = inferCategory(categoryRaw || title);
  const id = `${slugify(category)}-${slugify(brand || "brand")}-${slugify(title)}`;

  const { pricePublic, pricePremium } = priceHeuristic(title, category);

  const product = {
    id,
    title,
    brand: brand || "Diversos",
    category,
    subtitle: "",
    description: "",
    tags: buildTags(title, brand || "Diversos", category),
    tier: tierForProduct({ title, category }),
    pricePublic,
    pricePremium,
    featured: false,
    images: []
  };

  return product;
}

function dedupeKey(p) {
  return `${p.brand.toLowerCase()}|${p.title.toLowerCase()}`.replace(/\s+/g, " ").trim();
}

// ============ build ============
const files = fs.existsSync(DATASETS_DIR)
  ? fs.readdirSync(DATASETS_DIR).filter(f => f.toLowerCase().endsWith(".csv"))
  : [];

if (!files.length) {
  console.error(`[CAT] Nenhum CSV encontrado em ${DATASETS_DIR}`);
  console.error(`Crie a pasta /datasets na raiz e coloque CSVs lá dentro.`);
  process.exit(1);
}

console.log(`[CAT] Lendo ${files.length} arquivo(s) CSV de /datasets...`);

const all = [];
for (const f of files) {
  const fp = path.join(DATASETS_DIR, f);
  console.log(` - ${f}`);
  const rows = loadAnyCsv(fp);
  for (const row of rows) {
    const p = normalizeRow(row);
    if (p) all.push(p);
  }
}

console.log(`[CAT] Normalizados: ${all.length}`);

const seen = new Set();
const out = [];
for (const p of all) {
  const k = dedupeKey(p);
  if (seen.has(k)) continue;
  seen.add(k);
  out.push(p);
  if (out.length >= LIMIT) break;
}

console.log(`[CAT] Após dedupe + corte: ${out.length}`);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");

console.log(`[CAT] OK: ${OUT}`);
