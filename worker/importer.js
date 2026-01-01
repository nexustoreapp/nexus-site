import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parse } from "csv-parse/sync";

// ========= CONFIG =========
const FEED_URL = process.env.FEED_URL || "https://data.icecat.biz/export/freexml.int/INT/files.index.csv";
const MAX_PRODUCTS = Math.min(Number(process.env.MAX_PRODUCTS || 1200), 5000); // meta: 800+ sem explodir
const CATALOG_DIR = path.resolve("backend/data/catalog");

// categorias aceitas (nicho Kabum/ML tech)
const TECH_KEYWORDS = [
  "Graphics Card","Video Card","GPU",
  "Processor","CPU",
  "Memory","RAM",
  "SSD","Hard Drive","HDD","Storage","NVMe",
  "Motherboard",
  "Monitor","Display",
  "Keyboard","Mouse","Headset","Headphone","Microphone","Webcam",
  "Power Supply","PSU",
  "Laptop","Notebook","Desktop","PC",
  "Router","Switch","Network",
  "Printer","Scanner",
];

const BRAND_ALLOW = [
  "NVIDIA","AMD","Intel","ASUS","MSI","Gigabyte","ASRock",
  "Corsair","Kingston","Crucial","Samsung","Western Digital","Seagate","SanDisk",
  "Logitech","Razer","HyperX","SteelSeries","Redragon",
  "AOC","LG","Samsung","Dell","Acer","HP","Lenovo",
  "TP-Link","D-Link","Ubiquiti",
];

function norm(s="") { return String(s).toLowerCase(); }
function hasTechKeyword(catOrName="") {
  const t = norm(catOrName);
  return TECH_KEYWORDS.some(k => t.includes(norm(k)));
}
function hasAllowedBrand(brand="") {
  if (!brand) return false;
  const b = brand.trim();
  return BRAND_ALLOW.some(x => x.toLowerCase() === b.toLowerCase());
}

function detectCategory(title="", categoryName="") {
  const t = norm(title + " " + categoryName);

  if (t.includes("rtx") || t.includes("gtx") || t.includes("radeon") || t.includes("graphics") || t.includes("video card") || t.includes("gpu"))
    return "gpu";
  if (t.includes("processor") || t.includes("cpu") || t.includes("ryzen") || t.includes("intel core") || t.includes("i3") || t.includes("i5") || t.includes("i7") || t.includes("i9"))
    return "cpu";
  if (t.includes("memory") || t.includes("ram") || t.includes("ddr4") || t.includes("ddr5"))
    return "ram";
  if (t.includes("ssd") || t.includes("nvme") || t.includes("hdd") || t.includes("hard drive") || t.includes("storage") || t.includes("m.2"))
    return "storage";
  if (t.includes("motherboard") || t.includes("mainboard") || t.includes("placa-mae") || t.includes("placa mãe"))
    return "motherboard";
  if (t.includes("monitor") || t.includes("display") || t.includes("144hz") || t.includes("165hz") || t.includes("240hz"))
    return "monitor";
  if (t.includes("power supply") || t.includes("psu") || t.includes("fonte"))
    return "power";
  if (t.includes("router") || t.includes("switch") || t.includes("network"))
    return "network";
  if (t.includes("keyboard") || t.includes("mouse") || t.includes("headset") || t.includes("microphone") || t.includes("webcam") || t.includes("peripheral"))
    return "peripherals";

  return null;
}

function readJson(filePath, fallback=[]) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function upsertBySku(list, item) {
  const i = list.findIndex(x => x.sku === item.sku);
  if (i >= 0) {
    // update “real”: preço/estoque podem ficar null se ICECAT não der
    list[i] = { ...list[i], ...item, updatedAt: Date.now() };
    return "updated";
  }
  list.push({ ...item, createdAt: Date.now(), updatedAt: Date.now() });
  return "added";
}

// ========= IMPORT =========
async function main() {
  console.log("[IMPORTER] Iniciando import ICECAT index CSV…");
  ensureDir(CATALOG_DIR);

  const r = await fetch(FEED_URL);
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`FEED_URL falhou (${r.status}): ${txt.slice(0,200)}`);
  }
  const csvText = await r.text();

  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true
  });

  // Detect colunas comuns no files.index.csv
  const col = (name) => name;
  // Muitos índices têm: Product_ID, Supplier, Prod_ID, CatName, ProductName, Brand, EAN/UPC, MPN…
  // Vamos trabalhar de forma tolerante:
  const get = (row, keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return String(row[k]).trim();
    }
    return "";
  };

  let added = 0, updated = 0, kept = 0;

  for (const row of rows) {
    if ((added + updated) >= MAX_PRODUCTS) break;

    const productId = get(row, ["Product_ID","product_id","icecat_id","Icecat_ID"]);
    const title = get(row, ["ProductName","product_name","Title","title","Name","name"]);
    const categoryName = get(row, ["CatName","Category","CategoryName","category_name"]);
    const brand = get(row, ["Brand","brand","Supplier","supplier"]);
    const ean = get(row, ["EAN","ean","EAN_UPC","ean_upc","UPC","upc"]);
    const mpn = get(row, ["Prod_ID","prod_id","MPN","mpn","Model","model"]);

    // filtro nicho (Kabum-like)
    if (!hasTechKeyword(categoryName) && !hasTechKeyword(title)) continue;

    // filtro por marca (evita lixo massivo)
    // Se não tiver brand allow, ainda aceita se categoria for muito tech (GPU/CPU/RAM/SSD)
    const cat = detectCategory(title, categoryName);
    if (!cat) continue;

    const strictCats = new Set(["gpu","cpu","ram","storage","motherboard","monitor","power","network","peripherals"]);
    if (!strictCats.has(cat)) continue;

    if (!hasAllowedBrand(brand) && !["gpu","cpu","ram","storage","monitor","motherboard"].includes(cat)) continue;

    // sku canônico (real): preferir EAN/MPN/ICECAT ID
    const skuBase = (mpn || ean || productId || title).replace(/\s+/g," ").slice(0,80);
    const sku = `${cat}-${skuBase}`.replace(/[^a-zA-Z0-9\.\-\_]/g,"-").slice(0,90);

    // imagem: ICECAT index nem sempre tem; colocamos placeholder (real product, imagem depois via xml)
    const image = get(row, ["Image","ImageURL","image","image_url"]) || "";

    const item = {
      sku,
      title: title || `${brand} ${mpn || ""}`.trim(),
      category: cat,
      brand: brand || "",
      mpn: mpn || "",
      ean: ean || "",
      // ICECAT não é fornecedor; preço/estoque ficam null (depois você cruza com distribuidor)
      price: null,
      stock: null,
      image: image || "fallback.png",
      source: "icecat-index"
    };

    const filePath = path.join(CATALOG_DIR, `${cat}.json`);
    const list = readJson(filePath, []);
    const result = upsertBySku(list, item);
    writeJson(filePath, list);

    if (result === "added") added++;
    else updated++;
    kept++;
  }

  console.log(`[IMPORTER] Finalizado. processados=${kept} adicionados=${added} atualizados=${updated}`);
}

main().catch(err => {
  console.error("[IMPORTER] ERRO:", err.message);
  process.exit(1);
});