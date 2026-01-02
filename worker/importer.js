import fs from "fs";
import path from "path";

const CATALOG_DIR = path.resolve("backend/data/catalog");
const MAX_ADD = Number(process.env.MAX_ADD || 800);     // quanto adicionar (novos)
const MAX_PRICE = Number(process.env.MAX_PRICE || 5000); // quantos precificar por run (segurança)

function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
function readJson(p, fb=[]){ return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,"utf-8")) : fb; }
function writeJson(p, d){ fs.writeFileSync(p, JSON.stringify(d,null,2),"utf-8"); }
const slug = s => String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

function upsert(list, item){
  const i = list.findIndex(x=>x.sku===item.sku);
  if(i>=0) return false;
  list.push({...item, createdAt: Date.now(), updatedAt: Date.now()});
  return true;
}

function rand(min,max){
  const v = Math.random()*(max-min)+min;
  return Math.round(v/10)*10; // arredonda de 10 em 10
}
function randStock(){
  // estoque simples: 1 a 25 (com mais chance de valores pequenos)
  const r = Math.random();
  if (r < 0.55) return Math.floor(Math.random()*6)+1;     // 1-6
  if (r < 0.85) return Math.floor(Math.random()*10)+7;    // 7-16
  return Math.floor(Math.random()*9)+17;                  // 17-25
}

// ===============================
// PASSO 1 (COMPLETO): EXPANSÃO CATEGORIAS NOVAS
// ===============================
// ALFABÉTICO e com MUITO mais itens reais.
const EXPAND = {
  "access-point": [
    "Ubiquiti UniFi U6 Lite","Ubiquiti UniFi U6 Pro","Ubiquiti UniFi U6 Long-Range",
    "TP-Link EAP225","TP-Link EAP245","TP-Link EAP650","TP-Link EAP670",
    "MikroTik cAP ac","MikroTik hAP ac2","MikroTik Audience"
  ],
  "adapters": [
    "USB-C to HDMI Adapter","USB-C to Ethernet Adapter","USB-C to USB-A Adapter",
    "DisplayPort to HDMI Adapter","HDMI to VGA Adapter","USB-A to Ethernet Adapter",
    "USB-C to DisplayPort Adapter","USB-C to SD Card Reader"
  ],
  "audio-interface": [
    "Focusrite Scarlett Solo","Focusrite Scarlett 2i2","Focusrite Scarlett 4i4",
    "Behringer UMC22","Behringer UMC202HD","Behringer UMC404HD",
    "PreSonus AudioBox USB 96","M-Audio M-Track Solo","M-Audio M-Track Duo"
  ],
  "capture-card": [
    "Elgato HD60 S+","Elgato HD60 X","Elgato 4K60 Pro MK.2","Elgato Cam Link 4K",
    "AverMedia Live Gamer Mini","AverMedia Live Gamer 4K","AverMedia Live Gamer Portable 2 Plus"
  ],
  "desk": [
    "Mesa Gamer 120cm","Mesa Gamer 140cm","Mesa Escritório 120cm","Mesa Escritório 140cm",
    "Mesa Ajustável Standing Desk","Mesa com Suporte Monitor"
  ],
  "docking-station": [
    "Dell WD19 Dock","Dell WD22TB4 Dock","HP USB-C Dock G5","Lenovo ThinkPad USB-C Dock",
    "Anker PowerExpand Dock","UGreen USB-C Dock"
  ],
  "firewall": [
    "Fortinet FortiGate 40F","Fortinet FortiGate 60F",
    "Sophos XGS 87","Sophos XGS 107",
    "Ubiquiti Dream Machine","Ubiquiti Dream Machine Pro",
    "MikroTik RB4011","MikroTik CCR2004"
  ],
  "gaming-chair": [
    "Secretlab Titan Evo","DXRacer Formula","DXRacer Air",
    "ThunderX3 BC3","ThunderX3 EC3",
    "Corsair TC100","Corsair T3 Rush"
  ],
  "lighting": [
    "Elgato Key Light","Elgato Key Light Air","Ring Light 18in",
    "Godox LED Panel","Neewer LED Panel","Softbox 50x70"
  ],
  "mini-pc": [
    "Intel NUC i3","Intel NUC i5","Intel NUC i7",
    "Beelink SER5","Beelink SER6","Beelink GTR",
    "Minisforum UM560","Minisforum HX90","Minisforum NAB6",
    "ASUS PN50","ASUS PN64","ASUS PN80",
    "Lenovo ThinkCentre Tiny","HP ProDesk Mini"
  ],
  "monitor-arm": [
    "NB North Bayou F80","HUANUO Single Arm","HUANUO Dual Arm",
    "Elgato Wave Mic Arm","Ergotron LX Arm"
  ],
  "network-enterprise": [
    "Ubiquiti UniFi Switch 8","Ubiquiti UniFi Switch 16","Ubiquiti UniFi Switch 24",
    "MikroTik CRS112","MikroTik CRS326","MikroTik CRS305 10G",
    "Cisco CBS110","Cisco CBS250","Cisco CBS350",
    "TP-Link Omada Switch 8","TP-Link Omada Switch 24"
  ],
  "pc-gamer": [
    "PC Gamer RTX 3060","PC Gamer RTX 4060","PC Gamer RTX 4070","PC Gamer RTX 4080",
    "PC Gamer RX 6700 XT","PC Gamer RX 7700 XT","PC Gamer RX 7800 XT",
    "PC Gamer Ryzen 5","PC Gamer Ryzen 7","PC Gamer Intel i5","PC Gamer Intel i7"
  ],
  "pc-office": [
    "PC Office i3 SSD","PC Office i5 SSD","PC Office Ryzen 3","PC Office Ryzen 5",
    "PC Office Mini","PC Office All-in-One"
  ],
  "pdu": [
    "APC PDU Basic","Tripp Lite PDU","Intelbras PDU Rack","PDU 8 tomadas","PDU 12 tomadas"
  ],
  "rack": [
    "Rack 6U Parede","Rack 9U Parede","Rack 12U","Rack 16U","Rack 24U","Rack 42U"
  ],
  "servers": [
    "Dell PowerEdge T40","Dell PowerEdge T150","Dell PowerEdge T350",
    "HPE ProLiant MicroServer","HPE ProLiant ML30","HPE ProLiant DL20",
    "Lenovo ThinkSystem ST50","Lenovo ThinkSystem ST250","Lenovo ThinkSystem SR250"
  ],
  "stabilizer": [
    "APC Line-R 1200VA","SMS Revolution 1000VA","SMS Revolution 1500VA",
    "TS Shara 1200VA","TS Shara 1500VA"
  ],
  "ups": [
    "APC Back-UPS 600VA","APC Back-UPS 1200VA","APC Smart-UPS 1500VA","APC Smart-UPS 2200VA",
    "SMS Station II 1200VA","SMS Station II 1500VA","TS Shara UPS 1200VA","TS Shara UPS 1500VA"
  ],
  "usb-hub": [
    "Anker USB-C Hub 7-in-1","Anker USB-C Hub 8-in-1","Baseus 7-in-1 Hub",
    "Ugreen USB Hub 4 portas","Ugreen USB-C Hub 6-in-1","Orico USB Hub 7 portas"
  ],
  "webcam-pro": [
    "Logitech Brio 4K","Logitech C922","Logitech StreamCam",
    "Elgato Facecam","Razer Kiyo","Razer Kiyo Pro"
  ],
  "workstation": [
    "Workstation Xeon Entry","Workstation Xeon Pro","Workstation Ryzen 9",
    "Workstation Threadripper","Workstation Intel i9 Pro"
  ]
};

// ===============================
// PASSO 2 (COMPLETO): PREÇO BR PARA TODAS AS CATEGORIAS
// ===============================
// Regras realistas por categoria (pode ajustar depois).
const PRICE_TABLE = {
  // core tech
  gpu: [1200, 12000],
  cpu: [500, 6000],
  ram: [120, 1800],
  storage: [150, 2500],
  motherboard: [450, 3500],
  monitor: [700, 6000],
  peripherals: [80, 1800],
  power: [250, 1800],
  cooling: [120, 1800],
  case: [200, 1500],
  network: [120, 3500],
  audio: [120, 2500],
  camera: [200, 5000],
  printer: [500, 3500],
  console: [1200, 6000],
  mobile: [700, 7000],
  notebooks: [2500, 18000],
  tv: [1500, 12000],
  office: [50, 800],
  accessories: [20, 500],
  wearables: [400, 4000],
  smarthome: [60, 1200],

  // new categories (alfa)
  "access-point": [400, 3500],
  "adapters": [30, 350],
  "audio-interface": [600, 4500],
  "capture-card": [600, 4500],
  "desk": [500, 3500],
  "docking-station": [450, 3500],
  "firewall": [900, 15000],
  "gaming-chair": [900, 4500],
  "lighting": [150, 3000],
  "mini-pc": [1500, 6500],
  "monitor-arm": [150, 2000],
  "network-enterprise": [600, 12000],
  "pc-gamer": [3500, 25000],
  "pc-office": [1500, 9000],
  "pdu": [250, 2500],
  "rack": [600, 8000],
  "servers": [3000, 45000],
  "stabilizer": [250, 2500],
  "ups": [450, 15000],
  "usb-hub": [80, 900],
  "webcam-pro": [250, 3500],
  "workstation": [7000, 60000],
};

function applyPriceAndStock(list, category){
  const range = PRICE_TABLE[category] || [120, 2000];
  let count = 0;

  for (const item of list){
    if (count >= MAX_PRICE) break;

    // Só aplica se estiver vazio (não destrói preço já definido)
    if (item.price == null){
      item.price = rand(range[0], range[1]);
      item.currency = "BRL";
      item.stock = item.stock ?? randStock();
      item.updatedAt = Date.now();
      count++;
    } else {
      // garante stock mínimo se estiver null
      if (item.stock == null) item.stock = randStock();
      if (!item.currency) item.currency = "BRL";
    }
  }
  return count;
}

async function main(){
  console.log("[STEP-1+2] Expandir categorias novas + precificar tudo (BR)…");
  ensureDir(CATALOG_DIR);

  // ---- PASSO 1: adicionar novos itens nas categorias novas
  let addedTotal = 0;
  const catsAlpha = Object.keys(EXPAND).sort(); // alfabética

  for (const category of catsAlpha){
    const file = path.join(CATALOG_DIR, `${category}.json`);
    const list = readJson(file, []);

    for (const title of EXPAND[category]){
      if (addedTotal >= MAX_ADD) break;

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

      if (upsert(list, item)) addedTotal++;
    }

    writeJson(file, list);
    if (addedTotal >= MAX_ADD) break;
  }

  // ---- PASSO 2: aplicar preço BR em TODAS as categorias (inclusive antigas)
  let pricedTotal = 0;
  const files = fs.readdirSync(CATALOG_DIR).filter(f=>f.endsWith(".json"));

  for (const f of files){
    const category = f.replace(".json","");
    const file = path.join(CATALOG_DIR, f);
    const list = readJson(file, []);

    const c = applyPriceAndStock(list, category);
    pricedTotal += c;

    writeJson(file, list);
  }

  console.log(`[STEP-1+2] Finalizado. Novos adicionados=${addedTotal} | Novos precificados=${pricedTotal}`);
}

main().catch(e=>{
  console.error("[STEP-1+2] ERRO:", e.message);
  process.exit(1);
});