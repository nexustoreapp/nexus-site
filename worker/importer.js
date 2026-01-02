import fs from "fs";
import path from "path";

// ===== CONFIG =====
const MAX_PRODUCTS = Number(process.env.MAX_PRODUCTS || 1200);
const CATALOG_DIR = path.resolve("backend/data/catalog");

function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
function readJson(p, fb=[]){ return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,"utf-8")) : fb; }
function writeJson(p, d){ fs.writeFileSync(p, JSON.stringify(d,null,2),"utf-8"); }
function upsert(list, item){
  const i = list.findIndex(x=>x.sku===item.sku);
  if(i>=0){ list[i]={...list[i],...item,updatedAt:Date.now()}; return false; }
  list.push({...item,createdAt:Date.now(),updatedAt:Date.now()}); return true;
}
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

// ===== SEEDS REAIS =====
const BRANDS = {
  gpu: [
    { brand:"NVIDIA", models:["RTX 3050","RTX 3060","RTX 3060 Ti","RTX 3070","RTX 3070 Ti","RTX 3080","RTX 3080 Ti","RTX 3090","RTX 3090 Ti","RTX 4060","RTX 4060 Ti","RTX 4070","RTX 4070 Ti","RTX 4080","RTX 4090"] },
    { brand:"AMD", models:["RX 6600","RX 6650 XT","RX 6700 XT","RX 6750 XT","RX 6800","RX 6800 XT","RX 6900 XT","RX 6950 XT","RX 7600","RX 7700 XT","RX 7800 XT","RX 7900 XT","RX 7900 XTX"] }
  ],
  cpu: [
    { brand:"Intel", models:["Core i3-10100","Core i5-10400","Core i5-11400","Core i5-12400","Core i5-13400","Core i7-11700","Core i7-12700","Core i7-13700","Core i9-12900","Core i9-13900"] },
    { brand:"AMD", models:["Ryzen 3 3100","Ryzen 5 3600","Ryzen 5 5600","Ryzen 5 7600","Ryzen 7 3700X","Ryzen 7 5800X","Ryzen 7 7700","Ryzen 9 5900X","Ryzen 9 7950X"] }
  ],
  ram: [
    { brand:"Kingston", models:["8GB DDR4 2666","16GB DDR4 3200","32GB DDR4 3200","16GB DDR5 5200","32GB DDR5 6000"] },
    { brand:"Corsair", models:["8GB DDR4 3000","16GB DDR4 3600","32GB DDR4 3600","16GB DDR5 5600","32GB DDR5 6000"] }
  ],
  storage: [
    { brand:"Samsung", models:["SSD 500GB SATA","SSD 1TB SATA","SSD 1TB NVMe","SSD 2TB NVMe"] },
    { brand:"WD", models:["SSD 500GB NVMe","SSD 1TB NVMe","SSD 2TB NVMe","HDD 1TB","HDD 2TB"] },
    { brand:"Kingston", models:["SSD 480GB","SSD 960GB","SSD 1TB NVMe"] }
  ],
  monitor: [
    { brand:"AOC", models:["24\" 75Hz","24\" 144Hz","27\" 144Hz","27\" 165Hz"] },
    { brand:"LG", models:["24\" IPS 75Hz","27\" IPS 144Hz","34\" Ultrawide 144Hz"] },
    { brand:"Samsung", models:["24\" 75Hz","27\" 144Hz","32\" Curvo 165Hz"] }
  ],
  peripherals: [
    { brand:"Logitech", models:["Mouse G203","Mouse G305","Teclado G213","Headset G435"] },
    { brand:"Redragon", models:["Mouse Cobra","Teclado Kumara","Headset Zeus","Mouse M711"] },
    { brand:"HyperX", models:["Headset Cloud Stinger","Headset Cloud II","Teclado Alloy Core"] }
  ],
  motherboard: [
    { brand:"ASUS", models:["B450","B550","B660","Z690"] },
    { brand:"MSI", models:["B450","B550","B660","Z790"] },
    { brand:"Gigabyte", models:["B450","B550","B660","Z790"] }
  ],
  power: [
    { brand:"Corsair", models:["550W 80+ Bronze","650W 80+ Gold","750W 80+ Gold","850W 80+ Gold"] },
    { brand:"EVGA", models:["600W 80+ Bronze","700W 80+ Gold","850W 80+ Gold"] }
  ],
  network: [
    { brand:"TP-Link", models:["Router AC1200","Router AX3000","Switch 8 portas","Switch 16 portas"] },
    { brand:"D-Link", models:["Router AC750","Router AX1800","Switch 8 portas"] }
  ]
};

// ===== GERADOR =====
async function main(){
  console.log("[SEED] Gerando catálogo realista…");
  ensureDir(CATALOG_DIR);

  let total = 0;

  for(const [category, brands] of Object.entries(BRANDS)){
    const filePath = path.join(CATALOG_DIR, `${category}.json`);
    const list = readJson(filePath, []);

    for(const b of brands){
      for(const m of b.models){
        if(total >= MAX_PRODUCTS) break;

        const title = `${b.brand} ${m}`;
        const sku = `${category}-${slug(title)}`;

        const item = {
          sku,
          title,
          category,
          brand: b.brand,
          mpn: slug(title).toUpperCase(),
          ean: null,
          price: null,
          stock: null,
          image: "fallback.png",
          source: "seed-realista"
        };

        if(upsert(list, item)) total++;
      }
      if(total >= MAX_PRODUCTS) break;
    }

    writeJson(filePath, list);
    if(total >= MAX_PRODUCTS) break;
  }

  console.log(`[SEED] Finalizado. Produtos gerados=${total}`);
}

main().catch(e=>{
  console.error("[SEED] ERRO:", e.message);
  process.exit(1);
});