import fs from "fs";
import path from "path";
import csv from "csv-parser";

const INPUTS = [
  "./datasets/DatafinitiElectronicsProductsPricingData.csv",
  "./datasets/Best-Buy-dataset-sample.csv",
  "./datasets/flipkart_com-ecommerce_sample.csv",
  "./datasets/1429_1.csv"
];

const OUTPUT = "./backend/data/catalogo.json";

const CATEGORY_MAP = {
  gpu: "GPU",
  graphics: "GPU",
  cpu: "CPU",
  processor: "CPU",
  laptop: "Notebook",
  notebook: "Notebook",
  smartphone: "Smartphone",
  phone: "Smartphone",
  monitor: "Monitor",
  tv: "TV",
  headset: "Headset",
  headphone: "Headset",
  keyboard: "Teclado",
  mouse: "Mouse",
  ssd: "SSD",
  hard: "HDD",
  ram: "Memória RAM",
  memory: "Memória RAM",
  router: "Roteador",
  speaker: "Caixa de Som",
  webcam: "Webcam",
  microphone: "Microfone",
  console: "Console"
};

const catalog = [];
const seen = new Set();
let id = 1;

function normalizeCategory(text = "") {
  const t = text.toLowerCase();
  for (const key in CATEGORY_MAP) {
    if (t.includes(key)) return CATEGORY_MAP[key];
  }
  return null;
}

function cleanBrand(b) {
  if (!b) return null;
  const x = b.trim().toUpperCase();
  if (x === "UNKNOWN" || x === "GENERIC") return null;
  return x;
}

function readCSV(file) {
  return new Promise((resolve) => {
    const rows = [];
    fs.createReadStream(file)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows));
  });
}

(async () => {
  for (const file of INPUTS) {
    if (!fs.existsSync(file)) continue;

    const rows = await readCSV(file);

    for (const r of rows) {
      const title =
        r.title ||
        r.name ||
        r.product_name ||
        r.product_title;

      if (!title) continue;

      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const category = normalizeCategory(
        r.category || r.category_name || title
      );
      if (!category) continue;

      const brand = cleanBrand(r.brand || r.manufacturer);

      const price =
        parseFloat(r.price) ||
        parseFloat(r.sale_price) ||
        parseFloat(r.amount) ||
        null;

      catalog.push({
        id: `prod-${id++}`,
        title: title.trim(),
        brand,
        category,
        tier: "free",
        pricePublic: price || 0,
        pricePremium: price ? price * 0.95 : 0,
        specs: {},
        tags: [category.toLowerCase()]
      });
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(catalog, null, 2));
  console.log(`[CATALOGO] Gerado com ${catalog.length} produtos reais`);
})();
