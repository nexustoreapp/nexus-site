import fs from "fs";
import path from "path";

const MAX_PRODUCTS = Number(process.env.MAX_PRODUCTS || 500);
const CATALOG_DIR = path.resolve("backend/data/catalog");

function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
function readJson(p, fb=[]){ return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,"utf-8")) : fb; }
function writeJson(p, d){ fs.writeFileSync(p, JSON.stringify(d,null,2),"utf-8"); }
function upsert(list, item){
  if(list.some(x=>x.sku===item.sku)) return false;
  list.push({...item,createdAt:Date.now(),updatedAt:Date.now()});
  return true;
}
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

const EXPANSION = {
  "mini-pc": [
    "Intel NUC i3","Intel NUC i5","Intel NUC i7",
    "Beelink SER3","Beelink SER5","Beelink GTR",
    "Minisforum UM350","Minisforum UM560","Minisforum HX90",
    "ASUS PN50","ASUS PN64","ASUS PN80"
  ],
  "ups": [
    "APC Back-UPS 600VA","APC Back-UPS 1200VA","APC Smart-UPS 1500VA",
    "SMS Station II 1200VA","SMS Station II 1500VA",
    "TS Shara UPS 1200VA","TS Shara UPS 1500VA"
  ],
  "servers": [
    "Dell PowerEdge T40","Dell PowerEdge T150","Dell PowerEdge T350",
    "HPE ProLiant MicroServer","HPE ProLiant ML30",
    "Lenovo ThinkSystem ST50","Lenovo ThinkSystem ST250"
  ],
  "pc-gamer": [
    "PC Gamer RTX 3060","PC Gamer RTX 4060","PC Gamer RTX 4070",
    "PC Gamer RX 6700 XT","PC Gamer RX 7700 XT",
    "PC Gamer Ryzen 5","PC Gamer Ryzen 7"
  ],
  "network-enterprise": [
    "Ubiquiti UniFi Switch 8","Ubiquiti UniFi Switch 24",
    "MikroTik CRS112","MikroTik CRS326",
    "Cisco CBS110","Cisco CBS250"
  ],
  "gaming-chair": [
    "Secretlab Titan Evo","DXRacer Formula","DXRacer Air",
    "ThunderX3 BC3","Corsair TC100"
  ],
  "capture-card": [
    "Elgato HD60","Elgato HD60 X","Elgato 4K60 Pro",
    "AverMedia Live Gamer Mini","AverMedia Live Gamer 4K"
  ],
  "webcam-pro": [
    "Logitech Brio 4K","Logitech C922","Elgato Facecam",
    "Razer Kiyo","Razer Kiyo Pro"
  ]
};

async function main(){
  console.log("[STEP-1] Expandindo categorias novas…");
  ensureDir(CATALOG_DIR);

  let total = 0;

  for(const [category, titles] of Object.entries(EXPANSION)){
    const file = path.join(CATALOG_DIR, `${category}.json`);
    const list = readJson(file, []);

    for(const title of titles){
      if(total >= MAX_PRODUCTS) break;

      const sku = `${category}-${slug(title)}`;
      const item = {
        sku,
        title,
        category,
        brand: title.split(" ")[0],
        price: null,
        stock: null,
        image: "fallback.png",
        source: "seed-expansion"
      };

      if(upsert(list, item)) total++;
    }

    writeJson(file, list);
    if(total >= MAX_PRODUCTS) break;
  }

  console.log(`[STEP-1] Finalizado. Produtos adicionados=${total}`);
}

main().catch(e=>{
  console.error("[STEP-1] ERRO:", e.message);
  process.exit(1);
});