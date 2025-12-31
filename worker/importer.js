/**
 * worker/importer.js
 *
 * Worker de importação automática de catálogo (CSV / XML)
 * - Adiciona novos produtos
 * - Atualiza preço e estoque dos existentes
 * - SOMENTE nicho: eletrônicos / informática
 * - Usa JSON como banco (backend/data/catalog)
 *
 * Roda no Railway
 */

import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { parse } from "csv-parse/sync";
import xml2js from "xml2js";

// ===============================
// CONFIGURAÇÃO
// ===============================

// FEED DE EXEMPLO (depois você troca pela URL real)
const FEED_URL = process.env.FEED_URL || "https://example.com/feed.csv";

// Caminho do catálogo
const CATALOG_DIR = path.resolve("backend/data/catalog");

// Categorias aceitas (NÃO sai disso)
const ALLOWED_CATEGORIES = {
  gpu: ["gpu", "graphics", "placa de vídeo", "rtx", "gtx"],
  cpu: ["cpu", "processor", "processador", "ryzen", "intel"],
  ram: ["ram", "memory", "memória"],
  storage: ["ssd", "nvme", "hd", "storage", "armazenamento"],
  motherboard: ["motherboard", "placa-mãe", "mainboard"],
  monitor: ["monitor", "display"],
  peripherals: ["mouse", "keyboard", "teclado", "headset", "peripheral"],
  power: ["psu", "fonte", "power supply"]
};

// ===============================
// HELPERS
// ===============================

function normalize(text = "") {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectCategory(title) {
  const t = normalize(title);
  for (const [cat, keys] of Object.entries(ALLOWED_CATEGORIES)) {
    if (keys.some(k => t.includes(normalize(k)))) {
      return cat;
    }
  }
  return null;
}

function loadCatalog(category) {
  const file = path.join(CATALOG_DIR, `${category}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function saveCatalog(category, data) {
  const file = path.join(CATALOG_DIR, `${category}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ===============================
// PARSE FEED
// ===============================

async function fetchFeed() {
  const r = await fetch(FEED_URL);
  const text = await r.text();

  if (FEED_URL.endsWith(".xml")) {
    const parsed = await xml2js.parseStringPromise(text, { explicitArray: false });
    return parsed?.products?.product || [];
  }

  // CSV padrão
  return parse(text, {
    columns: true,
    skip_empty_lines: true
  });
}

// ===============================
// IMPORTAÇÃO
// ===============================

async function run() {
  console.log("[IMPORTER] Iniciando importação...");

  const feedItems = await fetchFeed();
  let added = 0;
  let updated = 0;

  for (const item of feedItems) {
    const title = item.title || item.name || "";
    const category = detectCategory(title);

    // Ignora tudo fora do nicho
    if (!category) continue;

    const sku = item.sku || item.id || normalize(title).slice(0, 40);
    const price = Number(item.price || item.sale_price || 0);
    const stock = Number(item.stock || item.quantity || 0);
    const image = item.image || item.image_url || "";

    if (!price || !image) continue;

    const catalog = loadCatalog(category);
    const existing = catalog.find(p => p.sku === sku);

    if (existing) {
      // Atualiza preço e estoque
      existing.price = price;
      existing.stock = stock;
      updated++;
    } else {
      // Novo produto
      catalog.push({
        sku,
        title,
        category,
        brand: item.brand || "",
        price,
        stock,
        image,
        source: "feed"
      });
      added++;
    }

    saveCatalog(category, catalog);
  }

  console.log(`[IMPORTER] Concluído: ${added} adicionados, ${updated} atualizados.`);
}

// ===============================
// EXECUÇÃO
// ===============================

run().catch(err => {
  console.error("[IMPORTER] ERRO:", err);
  process.exit(1);
});