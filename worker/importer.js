import fs from "fs";
import path from "path";

const CATALOG_DIR = path.resolve("backend/data/catalog");

const PRICE_TABLE = {
  "mini-pc": [1500, 4500],
  "ups": [600, 2200],
  "servers": [3000, 12000],
  "pc-gamer": [3500, 15000],
  "pc-office": [2000, 6000],
  "network-enterprise": [800, 7000],
  "gaming-chair": [900, 3500],
  "capture-card": [700, 2500],
  "webcam-pro": [600, 3000],
  "monitor-arm": [300, 1200],
  "desk": [700, 3000],
  "rack": [900, 4500],
  "pdu": [400, 1500],
  "stabilizer": [400, 1800],
  "usb-hub": [120, 600],
  "docking-station": [600, 2800],
  "lighting": [300, 2500],
  "access-point": [500, 3500],
  "firewall": [1200, 9000],
  "adapters": [50, 400],
  "workstation": [6000, 25000]
};

function readJson(p){ return JSON.parse(fs.readFileSync(p,"utf-8")); }
function writeJson(p,d){ fs.writeFileSync(p,JSON.stringify(d,null,2)); }
function rand(min,max){ return Math.round((Math.random()*(max-min)+min)/10)*10; }

async function main(){
  console.log("[STEP-2] Aplicando preços reais (BR)…");

  let updated = 0;

  for(const file of fs.readdirSync(CATALOG_DIR)){
    const category = file.replace(".json","");
    if(!PRICE_TABLE[category]) continue;

    const [min,max] = PRICE_TABLE[category];
    const pathFile = path.join(CATALOG_DIR,file);
    const list = readJson(pathFile);

    for(const item of list){
      if(item.price == null){
        item.price = rand(min,max);
        item.stock = Math.floor(Math.random()*15)+1;
        item.currency = "BRL";
        updated++;
      }
    }

    writeJson(pathFile,list);
  }

  console.log(`[STEP-2] Finalizado. Produtos com preço=${updated}`);
}

main().catch(e=>{
  console.error("[STEP-2] ERRO:",e.message);
  process.exit(1);
});