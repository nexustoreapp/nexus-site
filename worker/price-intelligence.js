/**
 * worker/price-intelligence.js
 * PASSO B — Inteligência de preço + imagens (SEM APAGAR NADA)
 *
 * O que faz:
 * - Não remove produto
 * - Não altera SKU/title/category
 * - Cria:
 *   - marketPriceBRL (referência atual)
 *   - nexusPriceBRL (baixo, margem mínima)
 *   - pricesByPlan (ganha nos planos)
 * - Marca:
 *   - show (true/false)
 *   - featured (true/false)
 *   - priority (0-5)
 * - Imagens:
 *   - se não tiver imagem válida → usa fallback por categoria
 * - Moeda:
 *   - grava priceUSD via taxa BRL->USD (Frankfurter/ECB)
 */

import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const CATALOG_DIR = path.resolve("backend/data/catalog");

// Config de estratégia: preço baixo, margem mínima
const NEXUS_DISCOUNT = 0.06;          // 6% abaixo do "marketPrice"
const MAX_OVER_AVG = 1.60;            // esconde se > 160% da média da categoria
const FEATURED_PERCENTILE = 0.20;     // top 20% mais baratos

// Descontos por plano (ganha no plano, não na margem)
const PLAN_MULT = {
  free: 1.00,
  core: 0.985,
  hype: 0.97,
  omega: 0.955
};

// Imagens por categoria (fallback decente)
// (Você pode trocar depois por imagens reais/pack)
const CATEGORY_IMAGE = {
  gpu: "fallback.png",
  cpu: "fallback.png",
  ram: "fallback.png",
  storage: "fallback.png",
  monitor: "fallback.png",
  peripherals: "fallback.png",
  notebooks: "fallback.png",
  mobile: "fallback.png",
  tv: "fallback.png",
  ups: "fallback.png",
  servers: "fallback.png",
  workstation: "fallback.png",
  "mini-pc": "fallback.png",
  "network-enterprise": "fallback.png",
  network: "fallback.png",
  accessories: "fallback.png",
  adapters: "fallback.png",
  "usb-hub": "fallback.png",
  "capture-card": "fallback.png",
  camera: "fallback.png",
  lighting: "fallback.png",
  "gaming-chair": "fallback.png",
  rack: "fallback.png",
  pdu: "fallback.png",
  stabilizer: "fallback.png",
  firewall: "fallback.png",
  "audio-interface": "fallback.png",
  audio: "fallback.png",
  printer: "fallback.png",
};

function readJson(p){
  if(!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p,"utf-8"));
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}
function writeJson(p,d){ fs.writeFileSync(p, JSON.stringify(d,null,2)); }

function toNumber(x){
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function round10(n){ return Math.round(n/10)*10; }

// Frankfurter (ECB) -> vamos pegar EUR->BRL e EUR->USD e derivar BRL->USD (sem key)
async function getBRLtoUSD(){
  try{
    const r = await fetch("https://api.frankfurter.dev/latest?from=EUR&to=BRL,USD");
    const j = await r.json();
    const eurToBRL = j?.rates?.BRL;
    const eurToUSD = j?.rates?.USD;
    if(!eurToBRL || !eurToUSD) return null;
    // 1 BRL em USD = (EUR->USD)/(EUR->BRL)
    return eurToUSD / eurToBRL;
  } catch {
    return null;
  }
}

function ensureImage(item){
  const img = String(item.image || "").trim();
  if(img && img !== "fallback.png") return;
  const cat = String(item.category || "").trim();
  item.image = CATEGORY_IMAGE[cat] || "fallback.png";
}

function computePlans(nexusPrice){
  const out = {};
  for(const [plan, mult] of Object.entries(PLAN_MULT)){
    out[plan] = round10(nexusPrice * mult);
  }
  return out;
}

function markCategory(items){
  // pega somente com preço
  const priced = items
    .map(p => ({ p, price: toNumber(p.price) }))
    .filter(x => x.price && x.price > 0);

  if(priced.length < 5){
    // poucos itens: só liga show e põe featured nos 3 mais baratos
    priced.sort((a,b)=>a.price-b.price);
    priced.forEach((x,idx)=>{
      x.p.show = true;
      x.p.featured = idx < 3;
      x.p.priority = idx < 3 ? 4 : 1;
    });
    return;
  }

  // média da categoria
  const avg = priced.reduce((s,x)=>s+x.price,0)/priced.length;

  // ordena por preço
  priced.sort((a,b)=>a.price-b.price);

  const featuredCount = Math.max(3, Math.floor(priced.length * FEATURED_PERCENTILE));
  const maxAllowed = avg * MAX_OVER_AVG;

  priced.forEach((x, idx)=>{
    // show/hide por outlier
    const isOutlier = x.price > maxAllowed;
    x.p.show = !isOutlier;

    // featured: top % barato, mas só se não for outlier
    x.p.featured = (!isOutlier && idx < featuredCount);

    // prioridade: featured alto, normal médio, outlier 0
    x.p.priority = x.p.featured ? 5 : (x.p.show ? 2 : 0);

    // score (0-100) por preço relativo à média
    const score = clamp(Math.round(100 * (avg / x.price)), 1, 100);
    x.p.score = score;

    // Preços: mantém referência e cria nexusPrice baixo
    x.p.marketPriceBRL = round10(x.price);
    const nexus = round10(x.price * (1 - NEXUS_DISCOUNT));
    x.p.nexusPriceBRL = Math.max(10, nexus);

    // planos (ganha no plano)
    x.p.pricesByPlan = computePlans(x.p.nexusPriceBRL);

    // padrão: moeda
    x.p.currency = "BRL";
  });
}

async function main(){
  console.log("[B] Price intelligence + images (append-only)");
  const fx = await getBRLtoUSD(); // pode ser null, tudo bem
  console.log("[B] FX BRL->USD:", fx ? fx.toFixed(6) : "indisponível");

  const files = fs.readdirSync(CATALOG_DIR).filter(f=>f.endsWith(".json"));
  let touched = 0;

  for(const f of files){
    const file = path.join(CATALOG_DIR,f);
    const list = readJson(file);
    if(!Array.isArray(list) || list.length === 0) continue;

    // garante category (se algum item antigo não tiver)
    for(const it of list){
      if(!it.category) it.category = f.replace(".json","");
      ensureImage(it);
      // se tem nexusPrice, atualiza USD também (sem mexer no BRL)
      if(fx && it.nexusPriceBRL){
        it.priceUSD = Number((it.nexusPriceBRL * fx).toFixed(2));
      }
      it.updatedAt = Date.now();
    }

    // marca featured/show/priority + cria market/nexus prices (sem apagar nada)
    markCategory(list);

    // reforça USD depois do cálculo
    if(fx){
      for(const it of list){
        if(it.nexusPriceBRL){
          it.priceUSD = Number((it.nexusPriceBRL * fx).toFixed(2));
        }
      }
    }

    writeJson(file, list);
    touched++;
  }

  console.log("[B] categorias processadas:", touched);
}

main().catch(e=>{
  console.error("[B] ERRO:", e.message);
  process.exit(1);
});