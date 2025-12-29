import fs from "fs";
import path from "path";

const CATALOG_DIR = path.resolve("backend/data/catalog");
const OUTPUT_PATH = path.resolve("backend/data/catalog.index.json");

// arquivos que NÃO são catálogo (mesmo se estiverem na pasta)
const IGNORE_FILES = new Set([
  "index.json",
  "catalog.index.json",
  "categories.index.json",
  "ia_personas.json",
  "ia_cache_base.json",
  "orders.json",
  "robot_rules.json",
  "supplier_map.json",
  "synceeQueue.json"
]);

function isJsonFile(f) {
  return f.toLowerCase().endsWith(".json");
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function normalizeCategoryFromFilename(file) {
  return file
    .replace(".json", "")
    .replace(/-/g, "_")
    .toLowerCase()
    .trim();
}

function extractSkusFromNicheData(data) {
  // Formato A: objeto de SKUs
  if (data && typeof data === "object" && !Array.isArray(data)) {
    // evita pegar metadados comuns
    const keys = Object.keys(data).filter(
      (k) =>
        k &&
        ![
          "version",
          "updatedAt",
          "bySku",
          "byProvider",
          "categories",
          "products",
          "data"
        ].includes(k)
    );
    return keys;
  }

  // Formato B: array de produtos [{sku:"..."}, ...]
  if (Array.isArray(data)) {
    return data
      .map((x) => x?.sku || x?.id || null)
      .filter((v) => typeof v === "string" && v.trim().length > 0);
  }

  return [];
}

function main() {
  if (!fs.existsSync(CATALOG_DIR)) {
    console.error("[CATALOG] Pasta não existe:", CATALOG_DIR);
    process.exit(1);
  }

  const files = fs
    .readdirSync(CATALOG_DIR)
    .filter(isJsonFile)
    .filter((f) => !IGNORE_FILES.has(f));

  const catalogIndex = {};
  let count = 0;

  for (const file of files) {
    const fullPath = path.join(CATALOG_DIR, file);
    const data = readJson(fullPath);

    const category = normalizeCategoryFromFilename(file);
    const skus = extractSkusFromNicheData(data);

    for (const sku of skus) {
      // evita duplicar (se um SKU aparecer em 2 nichos, mantém o primeiro e loga)
      if (catalogIndex[sku]) continue;

      catalogIndex[sku] = {
        category,
        file,
        active: true
      };
      count++;
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalogIndex, null, 2));
  console.log(`[CATALOG] catalog.index.json gerado com ${count} SKU(s).`);
  console.log(`[CATALOG] Fonte: ${CATALOG_DIR}`);
  console.log(`[CATALOG] Saída: ${OUTPUT_PATH}`);
}

main();
