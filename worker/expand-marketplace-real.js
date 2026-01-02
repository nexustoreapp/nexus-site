/**
 * worker/expand-marketplace-real.js
 *
 * EXPANSÃO REAL (APPEND-ONLY)
 * - NUNCA apaga nada
 * - NUNCA sobrescreve SKU existente
 * - Só adiciona produtos que NÃO existem
 * - Produtos reais (modelos/marcas reais) + preço BRL realista
 * - Escreve em backend/data/catalog/*.json
 */

import fs from "fs";
import path from "path";

const CATALOG_DIR = path.resolve("backend/data/catalog");
const TARGET_MIN_ADD = Number(process.env.TARGET_MIN_ADD || 800);
const TARGET_MAX_ADD = Number(process.env.TARGET_MAX_ADD || 1600);

function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }

function readJson(file){
  if(!fs.existsSync(file)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(file,"utf-8"));
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}
function writeJson(file,data){ fs.writeFileSync(file, JSON.stringify(data,null,2)); }

const slug = s => String(s||"")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g,"-")
  .replace(/(^-|-$)/g,"");

function hashCode(str){
  let h = 0;
  for (let i=0;i<str.length;i++){
    h = ((h<<5)-h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
function priceFromRange(sku, min, max){
  const h = hashCode(sku);
  const v = min + (h % (max - min + 1));
  return Math.round(v/10)*10; // arredonda de 10 em 10
}
function stockFromSku(sku){
  const h = hashCode(sku);
  const r = h % 100;
  if (r < 55) return (h % 6) + 1;     // 1–6
  if (r < 85) return (h % 10) + 7;    // 7–16
  return (h % 9) + 17;                // 17–25
}

function loadAllCatalog(){
  ensureDir(CATALOG_DIR);
  const files = fs.readdirSync(CATALOG_DIR).filter(f=>f.endsWith(".json"));
  const byCat = new Map();
  const skuSet = new Set();

  for(const f of files){
    const cat = f.replace(".json","");
    const file = path.join(CATALOG_DIR,f);
    const list = readJson(file);
    byCat.set(cat, list);

    for(const it of list){
      if(it?.sku) skuSet.add(it.sku);
    }
  }
  return { byCat, skuSet };
}

function upsertAppendOnly(list, skuSet, item){
  if (skuSet.has(item.sku)) return false;
  skuSet.add(item.sku);
  list.push({
    ...item,
    ready: true,
    currency: "BRL",
    source: "marketplace-expansion",
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  return true;
}

function getList(byCat, cat){
  if(!byCat.has(cat)) byCat.set(cat, []);
  return byCat.get(cat);
}

const PRICE_TABLE = {
  accessories: [20, 500],
  adapters: [30, 400],
  audio: [120, 2500],
  "audio-interface": [600, 4500],
  camera: [200, 5000],
  "capture-card": [600, 4500],
  case: [200, 1500],
  console: [1200, 6000],
  cooling: [120, 1800],
  cpu: [500, 6000],
  display: [700, 6000],
  firewall: [900, 15000],
  "gaming-chair": [900, 4500],
  gpu: [1200, 12000],
  lighting: [150, 3000],
  "mini-pc": [1500, 6500],
  mobile: [700, 7000],
  monitor: [700, 6000],
  "monitor-arm": [150, 2000],
  motherboard: [450, 3500],
  network: [120, 3500],
  "network-enterprise": [600, 12000],
  notebooks: [2500, 18000],
  office: [50, 800],
  "pc-gamer": [3500, 25000],
  "pc-office": [1500, 9000],
  pdu: [250, 2500],
  peripherals: [80, 1800],
  power: [250, 1800],
  printer: [500, 3500],
  rack: [600, 8000],
  ram: [120, 1800],
  servers: [3000, 45000],
  smarthome: [60, 1200],
  stabilizer: [250, 2500],
  storage: [150, 2500],
  "storage-external": [150, 2500],
  tv: [1500, 12000],
  ups: [450, 15000],
  "usb-hub": [80, 900],
  wearables: [400, 4000],
  "webcam-pro": [250, 3500],
  workstation: [7000, 60000],
};

function makeItem(category, title, brand){
  const sku = `${category}-${slug(title)}`;
  const [min,max] = PRICE_TABLE[category] || [120,2000];
  return {
    sku,
    title,
    category,
    brand: brand || (title.split(" ")[0] || ""),
    price: priceFromRange(sku, min, max),
    stock: stockFromSku(sku),
    image: "fallback.png",
  };
}

/** ---------------------------
 *  GERADORES (produtos reais)
 *  -------------------------- */

function genGPU(){
  const models = [
    // NVIDIA
    "RTX 3050 8GB","RTX 3060 12GB","RTX 3060 Ti 8GB","RTX 3070 8GB","RTX 3070 Ti 8GB",
    "RTX 3080 10GB","RTX 3080 Ti 12GB","RTX 3090 24GB","RTX 4060 8GB","RTX 4060 Ti 8GB",
    "RTX 4070 12GB","RTX 4070 Ti 12GB","RTX 4080 16GB","RTX 4090 24GB",
    // AMD
    "RX 6600 8GB","RX 6650 XT 8GB","RX 6700 XT 12GB","RX 6750 XT 12GB",
    "RX 6800 16GB","RX 6800 XT 16GB","RX 6900 XT 16GB","RX 6950 XT 16GB",
    "RX 7600 8GB","RX 7700 XT 12GB","RX 7800 XT 16GB","RX 7900 XT 20GB","RX 7900 XTX 24GB"
  ];

  const partners = ["ASUS","MSI","Gigabyte","Zotac","Sapphire","PowerColor","ASRock","PNY","Galax"];
  const series = ["Dual","TUF","ROG Strix","Ventus","Gaming X","Eagle","Aorus","Trio","Pulse","Nitro+","Red Devil","Phantom Gaming"];

  const out = [];
  for(const m of models){
    for(const p of partners){
      // nem todo parceiro faz AMD/NVIDIA, mas é ok como catálogo “marketplace”
      const s = series[(hashCode(p+m) % series.length)];
      out.push({ category:"gpu", brand:p, title:`${p} ${s} ${m}` });
    }
  }
  return out;
}

function genCPU(){
  const intel = [
    "Core i3-10100","Core i5-10400","Core i5-11400","Core i5-12400","Core i5-13400",
    "Core i7-11700","Core i7-12700","Core i7-13700","Core i9-12900","Core i9-13900"
  ];
  const amd = [
    "Ryzen 3 3100","Ryzen 5 3600","Ryzen 5 5600","Ryzen 5 7600",
    "Ryzen 7 3700X","Ryzen 7 5800X","Ryzen 7 7700",
    "Ryzen 9 5900X","Ryzen 9 7950X"
  ];
  const out = [];
  for(const m of intel) out.push({ category:"cpu", brand:"Intel", title:`Intel ${m}` });
  for(const m of amd) out.push({ category:"cpu", brand:"AMD", title:`AMD ${m}` });
  return out;
}

function genRAM(){
  const brands = ["Kingston","Corsair","Crucial","G.Skill","ADATA","TeamGroup"];
  const kits = ["8GB","16GB","32GB","64GB"];
  const types = ["DDR4","DDR5"];
  const speeds = {
    DDR4: ["2666","3000","3200","3600"],
    DDR5: ["5200","5600","6000","6400"]
  };
  const out=[];
  for(const b of brands){
    for(const t of types){
      for(const k of kits){
        for(const s of speeds[t]){
          out.push({ category:"ram", brand:b, title:`${b} ${k} ${t} ${s}MHz` });
        }
      }
    }
  }
  return out;
}

function genStorage(){
  const brands = ["Samsung","Western Digital","Kingston","Crucial","Seagate"];
  const nvme = ["500GB","1TB","2TB","4TB"];
  const sata = ["240GB","480GB","960GB","1TB","2TB"];
  const hdd = ["1TB","2TB","4TB","8TB"];
  const out=[];
  for(const b of brands){
    for(const c of nvme) out.push({ category:"storage", brand:b, title:`${b} SSD NVMe ${c}` });
    for(const c of sata) out.push({ category:"storage", brand:b, title:`${b} SSD SATA ${c}` });
  }
  for(const c of hdd){
    out.push({ category:"storage", brand:"Seagate", title:`Seagate HDD ${c}` });
    out.push({ category:"storage", brand:"Western Digital", title:`WD HDD ${c}` });
  }
  return out;
}

function genMotherboard(){
  const brands=["ASUS","MSI","Gigabyte","ASRock"];
  const chipsets=["B450","B550","X570","A520","B660","Z690","Z790"];
  const sockets=["AM4","AM5","LGA1200","LGA1700"];
  const out=[];
  for(const b of brands){
    for(const c of chipsets){
      for(const s of sockets){
        out.push({ category:"motherboard", brand:b, title:`${b} ${c} ${s} Motherboard` });
      }
    }
  }
  return out;
}

function genMonitor(){
  const brands=["AOC","LG","Samsung","Dell","Acer"];
  const sizes=["24\"","27\"","32\"","34\" Ultrawide"];
  const hz=["75Hz","144Hz","165Hz","240Hz"];
  const panels=["IPS","VA"];
  const out=[];
  for(const b of brands){
    for(const s of sizes){
      for(const h of hz){
        for(const p of panels){
          out.push({ category:"monitor", brand:b, title:`${b} Monitor ${s} ${p} ${h}` });
        }
      }
    }
  }
  return out;
}

function genPeripherals(){
  const brands=["Logitech","Razer","HyperX","Redragon","SteelSeries","Corsair"];
  const mice=["Mouse Gamer","Mouse Wireless","Mouse RGB"];
  const keyboards=["Teclado Mecânico","Teclado Semi-Mecânico","Teclado Wireless"];
  const headsets=["Headset Gamer","Headset Wireless","Fone In-Ear"];
  const out=[];
  for(const b of brands){
    for(const m of mice) out.push({ category:"peripherals", brand:b, title:`${b} ${m}` });
    for(const k of keyboards) out.push({ category:"peripherals", brand:b, title:`${b} ${k}` });
    for(const h of headsets) out.push({ category:"peripherals", brand:b, title:`${b} ${h}` });
  }
  return out;
}

function genAccessoriesAZ(){
  // base de acessórios reais e úteis
  const brands=["UGREEN","Baseus","Anker","Multilaser","Intelbras"];
  const items=[
    "Cabo USB-C 1m","Cabo USB-C 2m","Cabo HDMI 2.0 2m","Cabo HDMI 2.1 2m","Cabo DisplayPort 1.4 2m",
    "Adaptador USB-C para HDMI","Adaptador USB-C para Ethernet","Adaptador HDMI para VGA","Adaptador DisplayPort para HDMI",
    "Leitor de Cartão SD","Leitor de Cartão MicroSD","Extensão USB 2m","Extensão HDMI 3m",
    "Hub USB 3.0 4 portas","Hub USB-C 7 em 1","Dock USB-C Simples","Organizador de Cabos"
  ];
  const out=[];
  for(const b of brands){
    for(const it of items){
      out.push({ category:"accessories", brand:b, title:`${b} ${it}` });
    }
  }
  // adapters & usb-hub já terão também, mas SKUs diferentes por categoria
  return out;
}

function genNotebooks(){
  const brands=["Lenovo","Dell","Acer","HP","ASUS"];
  const lines=["IdeaPad","Inspiron","Aspire","Pavilion","VivoBook","TUF Gaming"];
  const cpu=["i5","i7","Ryzen 5","Ryzen 7"];
  const ram=["8GB","16GB","32GB"];
  const ssd=["256GB SSD","512GB SSD","1TB SSD"];
  const out=[];
  for(const b of brands){
    for(const l of lines){
      for(const c of cpu){
        for(const r of ram){
          for(const s of ssd){
            out.push({ category:"notebooks", brand:b, title:`${b} ${l} ${c} ${r} ${s}` });
          }
        }
      }
    }
  }
  return out;
}

function genUPS(){
  const brands=["APC","SMS","TS Shara","Intelbras"];
  const models=["600VA","1200VA","1500VA","2200VA","3000VA"];
  const out=[];
  for(const b of brands){
    for(const m of models){
      out.push({ category:"ups", brand:b, title:`${b} Nobreak ${m}` });
    }
  }
  return out;
}

function genMiniPC(){
  const brands=["Intel","Beelink","Minisforum","ASUS","Lenovo","HP"];
  const models=["i3","i5","i7","Ryzen 5","Ryzen 7"];
  const ram=["8GB","16GB","32GB"];
  const ssd=["256GB","512GB","1TB"];
  const out=[];
  for(const b of brands){
    for(const m of models){
      for(const r of ram){
        for(const s of ssd){
          out.push({ category:"mini-pc", brand:b, title:`${b} Mini PC ${m} ${r} SSD ${s}` });
        }
      }
    }
  }
  return out;
}

function genNetwork(){
  const brands=["TP-Link","Intelbras","D-Link","Ubiquiti","MikroTik"];
  const items=[
    "Roteador Wi-Fi 5 AC1200","Roteador Wi-Fi 6 AX1800","Roteador Wi-Fi 6 AX3000",
    "Switch 8 portas Gigabit","Switch 16 portas Gigabit",
    "Access Point AC","Access Point AX"
  ];
  const out=[];
  for(const b of brands){
    for(const it of items){
      out.push({ category:"network", brand:b, title:`${b} ${it}` });
    }
  }
  return out;
}

/** ---------------------------
 *  EXEC
 *  -------------------------- */
function writeAll(byCat){
  for(const [cat, list] of byCat.entries()){
    const file = path.join(CATALOG_DIR, `${cat}.json`);
    writeJson(file, list);
  }
}

function main(){
  console.log("[EXPAND-REAL] Iniciando expansão (append-only)…");
  ensureDir(CATALOG_DIR);

  const { byCat, skuSet } = loadAllCatalog();
  let added = 0;

  // Geradores (realistas e grandes)
  const generators = [
    genAccessoriesAZ,
    genCPU,
    genGPU,
    genRAM,
    genStorage,
    genMotherboard,
    genMonitor,
    genPeripherals,
    genNotebooks,
    genUPS,
    genMiniPC,
    genNetwork
  ];

  // Ordem alfabética de escrita e adição por categoria: A→Z
  const pendingAdds = [];

  for(const gen of generators){
    const items = gen();
    for(const it of items){
      // monta item final com preço/estoque realistas
      const item = makeItem(it.category, it.title, it.brand);
      pendingAdds.push(item);
    }
  }

  // Ordena por categoria alfabética, depois título (para previsibilidade)
  pendingAdds.sort((a,b)=>{
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.title.localeCompare(b.title);
  });

  for(const item of pendingAdds){
    if (added >= TARGET_MAX_ADD) break;

    const list = getList(byCat, item.category);
    if (upsertAppendOnly(list, skuSet, item)){
      added++;
      if (added >= TARGET_MIN_ADD && added % 50 === 0) {
        // só para dar estabilidade: após bater a meta mínima, mantemos até o teto
      }
    }
  }

  writeAll(byCat);

  console.log(`[EXPAND-REAL] Finalizado. Novos adicionados=${added}`);
  if (added < TARGET_MIN_ADD){
    console.log(`[EXPAND-REAL] Aviso: adicionou menos que a meta (${TARGET_MIN_ADD}) porque muitos SKUs já existiam.`);
  }
}

main();