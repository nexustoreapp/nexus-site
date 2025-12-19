import fs from "fs";
import path from "path";

const OUTPUT = path.resolve("backend/data/catalogo.json");

/* ======================================================
   CONFIGURAÇÕES GERAIS
====================================================== */

const BRANDS_GPU = ["ASUS", "MSI", "Gigabyte", "Zotac", "PNY"];
const BRANDS_MOUSE = ["Logitech", "Razer", "HyperX", "SteelSeries"];
const BRANDS_HEADSET = ["HyperX", "Logitech", "Razer", "SteelSeries"];

/* ======================================================
   MODELOS REAIS (BASE)
====================================================== */

const GPU_MODELS = [
  { model: "RTX 3060", tier: "core", price: 1899, memory: ["8GB", "12GB"] },
  { model: "RTX 3060 Ti", tier: "core", price: 2199, memory: ["8GB"] },
  { model: "RTX 3070", tier: "hyper", price: 2899, memory: ["8GB"] },
  { model: "RTX 4070", tier: "hyper", price: 3999, memory: ["12GB"] },
  { model: "RTX 4070 SUPER", tier: "hyper", price: 4299, memory: ["12GB"] },
  { model: "RTX 4080", tier: "omega", price: 5999, memory: ["16GB"] }
];

const MOUSE_MODELS = [
  { model: "Logitech G502 HERO", tier: "free", price: 249 },
  { model: "Razer DeathAdder V2", tier: "free", price: 229 },
  { model: "SteelSeries Rival 600", tier: "core", price: 399 }
];

const HEADSET_MODELS = [
  { model: "HyperX Cloud II", tier: "free", price: 399 },
  { model: "Logitech G Pro X", tier: "core", price: 899 },
  { model: "Razer BlackShark V2", tier: "core", price: 699 }
];

/* ======================================================
   GERADORES
====================================================== */

let catalog = [];
let id = 1;

function addProduct(p) {
  catalog.push({
    id: p.id,
    title: p.title,
    category: p.category,
    tier: p.tier,
    pricePublic: p.price,
    pricePremium: Math.max(p.price - 150, p.price * 0.85),
    specs: p.specs || {},
    tags: p.tags || [],
    images: [],
    featured: false
  });
}

/* ================= GPU ================= */

for (const gpu of GPU_MODELS) {
  addProduct({
    id: `gpu-${id++}`,
    title: `NVIDIA GeForce ${gpu.model}`,
    category: "Placa de Vídeo",
    tier: gpu.tier,
    price: gpu.price,
    specs: {
      memoryOptions: gpu.memory,
      brands: BRANDS_GPU,
      memoryType: "GDDR6 / GDDR6X",
      interface: "PCIe 4.0"
    },
    tags: ["gpu", "rtx", "nvidia"]
  });
}

/* ================= MOUSE ================= */

for (const mouse of MOUSE_MODELS) {
  addProduct({
    id: `mouse-${id++}`,
    title: mouse.model,
    category: "Mouse",
    tier: mouse.tier,
    price: mouse.price,
    specs: {
      brands: BRANDS_MOUSE,
      sensor: "Óptico",
      dpiRange: "Até 25.000 DPI"
    },
    tags: ["mouse", "gamer"]
  });
}

/* ================= HEADSET ================= */

for (const hs of HEADSET_MODELS) {
  addProduct({
    id: `headset-${id++}`,
    title: hs.model,
    category: "Headset",
    tier: hs.tier,
    price: hs.price,
    specs: {
      brands: BRANDS_HEADSET,
      connection: "USB / P2",
      surround: "7.1"
    },
    tags: ["headset", "gamer"]
  });
}

/* ======================================================
   SALVA
====================================================== */

fs.writeFileSync(OUTPUT, JSON.stringify(catalog, null, 2));
console.log(`[CATÁLOGO] Gerado com ${catalog.length} produtos reais`);
