import fs from "fs";
import path from "path";

// ===== CONFIG =====
const MAX_PRODUCTS = Number(process.env.MAX_PRODUCTS || 600);
const CATALOG_DIR = path.resolve("backend/data/catalog");

function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
function readJson(p, fb=[]){ return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,"utf-8")) : fb; }
function writeJson(p, d){ fs.writeFileSync(p, JSON.stringify(d,null,2),"utf-8"); }
function upsert(list, item){
  const i = list.findIndex(x=>x.sku===item.sku);
  if(i>=0) return false;
  list.push({...item,createdAt:Date.now(),updatedAt:Date.now()});
  return true;
}
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

// ===== SEED POR CATEGORIA (ALFABÉTICO) =====
const CATEGORIES = {
  "access-point": ["Ubiquiti UniFi U6 Lite","TP-Link EAP245","MikroTik cAP ac"],
  "adapters": ["USB-C to HDMI Adapter","USB-C to Ethernet Adapter","DisplayPort to HDMI Adapter"],
  "audio-interface": ["Focusrite Scarlett 2i2","Behringer UMC22","Presonus AudioBox USB"],
  "capture-card": ["Elgato HD60 X","AverMedia Live Gamer Mini","Elgato Cam Link 4K"],
  "desk": ["Gaming Desk 120cm","Office Desk 140cm","Standing Desk Adjustable"],
  "docking-station": ["Dell WD19 Dock","HP USB-C Dock G5","Lenovo ThinkPad Dock"],
  "firewall": ["Fortinet FortiGate 40F","Sophos XGS 87","Ubiquiti Dream Machine"],
  "gaming-chair": ["Secretlab Titan Evo","DXRacer Formula","ThunderX3 BC3"],
  "lighting": ["Elgato Key Light","Ring Light 18in","Godox LED Panel"],
  "mini-pc": ["Intel NUC i5","Beelink SER5","Minisforum UM560"],
  "monitor-arm": ["Elgato Wave Arm","NB North Bayou F80","HUANUO Dual Arm"],
  "network-enterprise": ["Cisco CBS110 Switch","Ubiquiti UniFi Switch 24","MikroTik CRS326"],
  "pc-gamer": ["PC Gamer RTX 4060","PC Gamer RTX 4070","PC Gamer RX 7700 XT"],
  "pc-office": ["PC Office i5 SSD","PC Office Ryzen 5","PC Office Mini"],
  "pdu": ["APC PDU Basic","Intelbras PDU Rack","Tripp Lite PDU"],
  "rack": ["Rack 12U","Rack 24U","Wall Mount Rack 9U"],
  "servers": ["Dell PowerEdge T40","HPE ProLiant MicroServer","Lenovo ThinkSystem ST50"],
  "stabilizer": ["APC Line-R 1200VA","SMS Revolution 1000VA","TS Shara 1200VA"],
  "ups": ["APC Back-UPS 1200VA","SMS Station II 1400VA","Nobreak TS Shara 1500VA"],
  "usb-hub": ["Anker USB-C Hub","Baseus 7-in-1 Hub","Ugreen USB Hub"],
  "webcam-pro": ["Logitech Brio 4K","Elgato Facecam","Razer Kiyo Pro"],
  "workstation": ["Workstation Xeon","Workstation Ryzen 9","Workstation Threadripper"]
};

async function main(){
  console.log("[SEED-ALPHA] Gerando categorias novas (A–Z)...");
  ensureDir(CATALOG_DIR);

  let total = 0;

  for(const [category, items] of Object.entries(CATEGORIES)){
    const filePath = path.join(CATALOG_DIR, `${category}.json`);
    const list = readJson(filePath, []);

    for(const title of items){
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
        source: "seed-complementar"
      };

      if(upsert(list, item)) total++;
    }

    writeJson(filePath, list);
    if(total >= MAX_PRODUCTS) break;
  }

  console.log(`[SEED-ALPHA] Finalizado. Produtos adicionados=${total}`);
}

main().catch(e=>{
  console.error("[SEED-ALPHA] ERRO:", e.message);
  process.exit(1);
});