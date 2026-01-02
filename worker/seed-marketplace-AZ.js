import fs from "fs";
import path from "path";

const DIR = path.resolve("backend/data/catalog");

function read(file){
  if (!fs.existsSync(file)) return [];
  try {
    const d = JSON.parse(fs.readFileSync(file,"utf-8"));
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}
function write(file,data){
  fs.writeFileSync(file, JSON.stringify(data,null,2));
}
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

const CATEGORIES = {
  accessories: [
    "Cabo USB-C 1m","Cabo USB-C 2m","Cabo HDMI 2.1","Adaptador USB-C para HDMI",
    "Hub USB 3.0","Hub USB-C 7 em 1","Leitor de Cartão SD","Adaptador Bluetooth USB"
  ],
  adapters: [
    "Adaptador USB-A para USB-C","Adaptador HDMI para VGA","Adaptador DisplayPort para HDMI"
  ],
  audio: [
    "Caixa de Som Bluetooth","Soundbar Compacta","Headphone Over-Ear","Fone In-Ear"
  ],
  "audio-interface": [
    "Focusrite Scarlett 2i2","Behringer UMC22","PreSonus AudioBox"
  ],
  camera: [
    "Webcam Full HD","Webcam 4K","Câmera de Segurança Wi-Fi"
  ],
  "capture-card": [
    "Elgato HD60 X","AverMedia Live Gamer Mini"
  ],
  desk: [
    "Mesa Gamer 120cm","Mesa Escritório 140cm"
  ],
  "docking-station": [
    "Dell WD19 Dock","HP USB-C Dock G5"
  ],
  firewall: [
    "Ubiquiti Dream Machine","Fortinet FortiGate 40F"
  ],
  "gaming-chair": [
    "Secretlab Titan Evo","DXRacer Formula"
  ],
  lighting: [
    "Ring Light 18in","Painel LED para Estúdio"
  ],
  "mini-pc": [
    "Intel NUC i5","Beelink SER5","Minisforum UM560"
  ],
  monitor: [
    "Monitor 24\" 144Hz","Monitor 27\" 165Hz"
  ],
  "monitor-arm": [
    "Braço Articulado para Monitor"
  ],
  network: [
    "Roteador Wi-Fi 6","Switch Gigabit 8 portas"
  ],
  "network-enterprise": [
    "Ubiquiti UniFi Switch 24","MikroTik CRS326"
  ],
  notebooks: [
    "Notebook i5 SSD","Notebook Ryzen 7"
  ],
  "pc-gamer": [
    "PC Gamer RTX 4060","PC Gamer RX 7700 XT"
  ],
  "pc-office": [
    "PC Office i5 SSD","PC Office Mini"
  ],
  rack: [
    "Rack 12U","Rack 24U"
  ],
  servers: [
    "Dell PowerEdge T40","HPE ProLiant MicroServer"
  ],
  storage: [
    "SSD 1TB NVMe","HD 2TB"
  ],
  tv: [
    "Smart TV 50\" 4K","Smart TV 65\" QLED"
  ],
  ups: [
    "Nobreak 1200VA","Nobreak 2200VA"
  ],
  "usb-hub": [
    "Hub USB-C 6 em 1","Hub USB 4 portas"
  ],
  wearables: [
    "Smartwatch","Pulseira Fitness"
  ],
  "webcam-pro": [
    "Logitech Brio 4K","Elgato Facecam"
  ],
  workstation: [
    "Workstation Ryzen 9","Workstation Xeon"
  ]
};

let totalAdded = 0;

for (const [category, items] of Object.entries(CATEGORIES)) {
  const file = path.join(DIR, `${category}.json`);
  const list = read(file);

  for (const title of items) {
    const sku = `${category}-${slug(title)}`;
    if (list.some(p => p.sku === sku)) continue;

    list.push({
      sku,
      title,
      category,
      price: Math.floor(Math.random()*4000 + 200),
      stock: Math.floor(Math.random()*20 + 1),
      currency: "BRL",
      ready: true,
      source: "seed-marketplace",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    totalAdded++;
  }

  write(file, list);
}

console.log(`Marketplace A-Z: produtos adicionados = ${totalAdded}`);