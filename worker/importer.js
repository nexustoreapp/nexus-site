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

// categorias aceitas
const TECH_WORDS = [
  "graphics","video","gpu","processor","cpu","memory","ram",
  "ssd","hdd","storage","motherboard","monitor","display",
  "keyboard","mouse","headset","microphone","power","psu",
  "laptop","notebook","desktop","router","switch","network"
];

const BRANDS = [
  "nvidia","amd","intel","asus","msi","gigabyte","asrock",
  "corsair","kingston","crucial","samsung","seagate","wd",
  "logitech","razer","hyperx","steelseries","redragon",
  "aoc","lg","dell","acer","hp","lenovo","tp-link","d-link"
];

const norm = s => String(s || "").toLowerCase();
const hasTech = s => TECH_WORDS.some(w => norm(s).includes(w));
const hasBrand = b => BRANDS.includes(norm(b));

function detectCategory(t) {
  t = norm(t);
  if (t.includes("rtx") || t.includes("gtx") || t.includes("radeon")) return "gpu";
  if (t.includes("cpu") || t.includes("processor") || t.includes("ryzen")) return "cpu";
  if (t.includes("ram") || t.includes("ddr")) return "ram";
  if (t.includes("ssd") || t.includes("nvme") || t.includes("hdd")) return "storage";
  if (t.includes("motherboard")) return "motherboard";
  if (t.includes("monitor") || t.includes("display")) return "monitor";
  if (t.includes("psu") || t.includes("power supply")) return "power";
  if (t.includes("router") || t.includes("switch")) return "network";
  if (t.includes("keyboard") || t.includes("mouse") || t.includes("headset")) return "peripherals";
  return null;
}

function readJson(p, fb=[]) {
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,"utf-8")) : fb;
}
function writeJson(p, d) {
  fs.writeFileSync(p, JSON.stringify(d,null,2));
}
function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true});
}

function upsert(list, item){
  const i = list.findIndex(x => x.sku === item.sku);
  if (i >= 0){ list[i] = {...list[i], ...item}; return false; }
  list.push(item); return true;
}

async function main(){
  console.log("[IMPORTER] Iniciando import ICECAT (stream)…");
  ensureDir(CATALOG_DIR);

  const auth = Buffer.from(`${ICECAT_USER}:${ICECAT_PASS}`).toString("base64");
  const res = await fetch(FEED_URL, {
    headers: { Authorization: `Basic ${auth}` }
  });
  if (!res.ok) throw new Error(`ICECAT ${res.status}`);

  let added = 0;
  let processed = 0;

  const parser = res.body.pipe(parse({ columns: true }));

  for await (const row of parser) {
    if (added >= MAX_PRODUCTS) break;

    const title = row.ProductName || row.Title || "";
    const brand = row.Brand || row.Supplier || "";
    const catName = row.CatName || "";

    if (!hasTech(title) && !hasTech(catName)) continue;
    if (!hasBrand(brand)) continue;

    const cat = detectCategory(title + " " + catName);
    if (!cat) continue;

    const mpn = row.Prod_ID || row.MPN || "";
    const ean = row.EAN || row.UPC || "";
    const sku = `${cat}-${(mpn || ean || title).slice(0,80)}`
      .replace(/[^a-zA-Z0-9\-_]/g,"-");

    const item = {
      sku,
      title,
      category: cat,
      brand,
      mpn,
      ean,
      price: null,
      stock: null,
      image: "fallback.png",
      source: "icecat"
    };

    const file = path.join(CATALOG_DIR, `${cat}.json`);
    const list = readJson(file, []);
    if (upsert(list, item)) {
      writeJson(file, list);
      added++;
    }

    processed++;
    if (processed % 500 === 0) {
      console.log(`[IMPORTER] Processados ${processed}, adicionados ${added}`);
    }
  }

  console.log(`[IMPORTER] Finalizado. Adicionados=${added}`);
}

main().catch(e => {
  console.error("[IMPORTER] ERRO:", e.message);
  process.exit(1);
});