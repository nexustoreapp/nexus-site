import fs from "fs";
import path from "path";

const CATALOG_PATH = path.resolve("backend/data/catalogo.json");

if (!fs.existsSync(CATALOG_PATH)) {
  console.error("[CATALOG] Não achei:", CATALOG_PATH);
  process.exit(1);
}

const raw = fs.readFileSync(CATALOG_PATH, "utf-8");
const catalog = JSON.parse(raw);

console.log(`[CATALOG] OK: carregou ${catalog.length} produtos de ${CATALOG_PATH}`);
