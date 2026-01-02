/**
 * worker/finalize-catalog-b.js
 * B1+B2+B3 — Correção final de catálogo (APPEND-ONLY)
 */

import fs from "fs";
import path from "path";

const DIR = path.resolve("backend/data/catalog");

// imagem padrão por categoria
const CATEGORY_IMAGE = cat => `/images/categories/${cat}.png`;

function read(file){
  if (!fs.existsSync(file)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(file,"utf-8"));
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}
function write(file,data){
  fs.writeFileSync(file, JSON.stringify(data,null,2));
}
function isValidPrice(n){
  return Number.isFinite(Number(n)) && Number(n) > 0;
}
function round10(n){ return Math.round(n/10)*10; }

function finalizeCategory(cat, list){
  // preços válidos existentes
  const validPrices = list
    .map(p => Number(p.price))
    .filter(isValidPrice)
    .sort((a,b)=>a-b);

  const baseMin = validPrices.length ? validPrices[0] : null;

  let fixedPrice = 0, fixedImg = 0;

  for (const p of list){
    // B1 — preço zerado
    if (!isValidPrice(p.price) && baseMin){
      const newPrice = round10(baseMin * 1.03); // +3%
      p.price = newPrice;
      p.currency = "BRL";
      p.priceConfidence = "low";
      fixedPrice++;
    }

    // B2 — imagem padrão
    if (!p.image || p.image === "fallback.png"){
      p.image = CATEGORY_IMAGE(cat);
      fixedImg++;
    }

    p.updatedAt = Date.now();
  }

  return { fixedPrice, fixedImg };
}

function main(){
  console.log("[B] Finalizando catálogo (preço + imagem + confiança)…");
  const files = fs.readdirSync(DIR).filter(f=>f.endsWith(".json"));

  let totalPriceFix = 0;
  let totalImgFix = 0;

  for (const f of files){
    const cat = f.replace(".json","");
    const file = path.join(DIR, f);
    const list = read(file);
    if (!list.length) continue;

    const { fixedPrice, fixedImg } = finalizeCategory(cat, list);
    totalPriceFix += fixedPrice;
    totalImgFix += fixedImg;

    write(file, list);
  }

  console.log(`[B] Concluído. Preços corrigidos=${totalPriceFix} | Imagens aplicadas=${totalImgFix}`);
}

main();