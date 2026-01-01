import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parse } from "csv-parse/sync";

// ========= CONFIG =========
const ICECAT_USER = process.env.ICECAT_USER;
const ICECAT_PASS = process.env.ICECAT_PASS;
const FEED_URL = "https://data.icecat.biz/export/freexml.int/INT/files.index.csv";
const MAX_PRODUCTS = Math.min(Number(process.env.MAX_PRODUCTS || 1200), 5000);
const CATALOG_DIR = path.resolve("backend/data/catalog");

if (!ICECAT_USER || !ICECAT_PASS) {
  throw new Error("ICECAT_USER ou ICECAT_PASS não definidos");
}

// categorias aceitas (nicho Kabum/ML tech)
const TECH_KEYWORDS = [
  "Graphics","Video","GPU","Processor","CPU","Memory","RAM","SSD","HDD","Storage",
  "Motherboard","Monitor","Display","Keyboard","Mouse","Headset","Microphone",
  "Power Supply","PSU","Laptop","Notebook","Desktop","PC","Router","Switch","Network",
  "Printer","Scanner",
];

const BRAND_ALLOW = [
  "NVIDIA","AMD","Intel","ASUS","MSI","Gigabyte","ASRock",
  "Corsair","Kingston","Crucial","Samsung","Western Digital","Seagate","SanDisk",
  "Logitech","Razer","HyperX","SteelSeries","Redragon",
  "AOC","LG","Dell","Acer","HP","Lenovo","TP-Link","D-Link","Ubiquiti",
];

const norm = (s="") => String(s).toLowerCase();
const hasTech = (s="") => TECH_KEYWORDS.some(k => norm(s).includes(norm(k)));
const hasBrand = (b="") => BRAND_ALLOW.some(x => x.toLowerCase() === norm(b));

function detectCategory(title="", cat="") {
  const t = norm(title + " " + cat);
  if (t.includes("rtx") || t.includes("gtx") || t.includes("radeon") || t.includes("gpu")) return "gpu";
  if (t.includes("cpu") || t.includes("processor") || t.includes("ryzen") || t.includes("intel core")) return "cpu";
  if (t.includes("ram") || t.includes("ddr4") || t.includes("ddr5")) return "ram";
  if (t.includes("ssd") || t.includes("nvme") || t.includes("hdd") || t.includes("storage")) return "storage";
  if (t.includes("motherboard")) return "motherboard";
  if (t.includes("monitor") || t.includes("display") || t.includes("hz")) return "monitor";
  if (t.includes("psu") || t.includes("power supply")) return "power";
  if (t.includes("router") || t.includes("switch") || t.includes("network")) return "network";
  if (t.includes("keyboard") || t.includes("mouse") || t.includes("headset") || t.includes("microphone")) return "peripherals";
  return null;
}

const readJson = (p, fb=[]) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,"utf-8")) : fb;
const writeJson = (p, d) => fs.writeFileSync(p, JSON.stringify(d,null,2), "utf-8");
const ensureDir = d => !fs.existsSync(d) && fs.mkdirSync(d,{recursive:true});

function upsert(list, item){
  const i = list.findIndex(x => x.sku === item.sku);
  if (i >= 0){ list[i] = {...list[i], ...item, updatedAt: Date.now()}; return "updated"; }
  list.push({...item, createdAt: Date.now(), updatedAt: Date.now()}); return "added";
}

async function main(){
  console.log("[IMPORTER] Iniciando import ICECAT index CSV…");
  ensureDir(CATALOG_DIR);

  const auth = Buffer.from(`${ICECAT_USER}:${ICECAT_PASS}`).toString("base64");
  const r = await fetch(FEED_URL, { headers: { "Authorization": `Basic ${auth}` }});
  if (!r.ok){
    const t = await r.text().catch(()=> "");
    throw new Error(`ICECAT ${r.status}: ${t.slice(0,200)}`);
  }

  const csvText = await r.text();
  const rows = parse(csvText, { columns: true, skip_empty_lines: true });

  let added=0, updated=0, processed=0;

  for (const row of rows){
    if (added + updated >= MAX_PRODUCTS) break;

    const get = ks => ks.find(k => row[k] && String(row[k]).trim()) ? String(row[ks.find(k => row[k] && String(row[k]).trim())]).trim() : "";

    const title = get(["ProductName","product_name","Title","title","Name","name"]);
    const catName = get(["CatName","Category","CategoryName","category_name"]);
    const brand = get(["Brand","brand","Supplier","supplier"]);
    const ean = get(["EAN","ean","UPC","upc"]);
    const mpn = get(["Prod_ID","prod_id","MPN","mpn","Model","model"]);

    if (!hasTech(title) && !hasTech(catName)) continue;
    const cat = detectCategory(title, catName);
    if (!cat) continue;
    if (!hasBrand(brand) && !["gpu","cpu","ram","storage","monitor","motherboard"].includes(cat)) continue;

    const skuBase = (mpn || ean || title).slice(0,80);
    const sku = `${cat}-${skuBase}`.replace(/[^a-zA-Z0-9\.\-\_]/g,"-").slice(0,90);

    const item = {
      sku,
      title: title || `${brand} ${mpn || ""}`.trim(),
      category: cat,
      brand: brand || "",
      mpn: mpn || "",
      ean: ean || "",
      price: null,
      stock: null,
      image: "fallback.png",
      source: "icecat-index"
    };

    const fp = path.join(CATALOG_DIR, `${cat}.json`);
    const list = readJson(fp, []);
    const res = upsert(list, item);
    writeJson(fp, list);

    if (res === "added") added++; else updated++;
    processed++;
  }

  console.log(`[IMPORTER] Finalizado. processados=${processed} adicionados=${added} atualizados=${updated}`);
}

main().catch(e => { console.error("[IMPORTER] ERRO:", e.message); process.exit(1); });