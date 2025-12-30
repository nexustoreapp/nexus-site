import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API = process.env.NEXUS_API; // URL do backend
if (!API) {
  console.error("[REFRESH] NEXUS_API não definido");
  process.exit(1);
}

const CATALOG_INDEX = path.join(__dirname, "..", "data", "catalog.index.json");

function loadCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_INDEX, "utf-8"));
}

async function run() {
  const index = loadCatalog();

  const items = Object.entries(index)
    .filter(([, v]) => v?.active)
    .map(([sku, v]) => ({
      sku,
      category: v.category || null,
      title: v.title || sku,
      supplierProductId: v.supplierProductId || null
    }));

  console.log(`[REFRESH] Enfileirando ${items.length} SKUs`);

  // fornecedor principal
  await fetch(`${API}/api/live/request-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      supplier: "syncee",
      priority: 1,
      items
    })
  });

  // fallback
  await fetch(`${API}/api/live/request-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      supplier: "zendrop",
      priority: 0,
      items
    })
  });

  console.log("[REFRESH] Batch enviado com sucesso");
}

run().catch(err => {
  console.error("[REFRESH] ERRO:", err);
  process.exit(1);
});