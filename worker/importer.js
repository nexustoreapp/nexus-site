import fs from "fs";
import path from "path";

const CATALOG_DIR = path.resolve("backend/data/catalog");
const MAX_ADD = Number(process.env.MAX_ADD || 800);
const MAX_PRICE = Number(process.env.MAX_PRICE || 99999);

function ensureDir(d){
  if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true});
}

function readJson(p){
  if(!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p,"utf-8"));
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.items)) return raw.items;
    if (raw && Array.isArray(raw.products)) return raw.products;
    return [];
  } catch {
    return [];
  }
}

function writeJson(p, d){
  fs.writeFileSync(p, JSON.stringify(d,null,2),"utf-8");
}

const slug = s =>
  String(s||"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/(^-|-$)/g,"");

function upsert(list, item){
  if(!Array.isArray(list)) return false;
  if(list.find(x=>x.sku===item.sku)) return false;
  list.push({...item, createdAt: Date.now(), updatedAt: Date.now()});
  return true;
}

function rand(min,max){
  return Math.round((Math.random()*(max-min)+min)/10)*10;
}

function randStock(){
  const r=Math.random();
  if(r<0.6) return Math.floor(Math.random()*5)+1;
  if(r<0.9) return Math.floor(Math.random()*10)+6;
  return Math.floor(Math.random()*10)+16;
}

const PRICE_TABLE = {
  gpu:[1200,12000],
  cpu:[500,6000],
  ram:[120,1800],
  storage:[150,2500],
  monitor:[700,6000],
  peripherals:[80,1800],
  "mini-pc":[1500,6500],
  "pc-gamer":[3500,25000],
  "pc-office":[1500,9000],
  servers:[3000,45000],
  ups:[450,15000],
  rack:[600,8000],
  firewall:[900,15000],
  workstation:[7000,60000]
};

async function main(){
  console.log("[STEP-1+2] Normalizando catálogo + preços BR…");
  ensureDir(CATALOG_DIR);

  const files = fs.readdirSync(CATALOG_DIR).filter(f=>f.endsWith(".json"));
  let fixed=0, priced=0;

  for(const f of files){
    const category = f.replace(".json","");
    const file = path.join(CATALOG_DIR,f);

    let list = readJson(file);
    if(!Array.isArray(list)) list=[];

    // PASSO 2 — PREÇO
    const range = PRICE_TABLE[category] || [120,2000];
    for(const item of list){
      if(item.price == null){
        item.price = rand(range[0],range[1]);
        item.currency="BRL";
        item.stock=randStock();
        item.updatedAt=Date.now();
        priced++;
      }
    }

    writeJson(file,list);
    fixed++;
  }

  console.log(`[STEP-1+2] OK. Arquivos normalizados=${fixed} | Produtos precificados=${priced}`);
}

main().catch(e=>{
  console.error("[STEP-1+2] ERRO FATAL:", e.message);
  process.exit(1);
});