import fs from "fs";
import path from "path";

const CATALOG_DIR = path.resolve("backend/data/catalog");

function readJson(p){
  if(!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p,"utf-8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeJson(p,d){
  fs.writeFileSync(p,JSON.stringify(d,null,2));
}

function randStock(){
  const r = Math.random();
  if (r < 0.6) return Math.floor(Math.random()*5)+1;     // 1–5
  if (r < 0.9) return Math.floor(Math.random()*10)+6;    // 6–15
  return Math.floor(Math.random()*10)+16;                // 16–25
}

async function main(){
  console.log("[FINAL-CLEAN] Iniciando limpeza final do catálogo…");

  let fixed = 0;
  let removed = 0;

  const files = fs.readdirSync(CATALOG_DIR).filter(f=>f.endsWith(".json"));

  for(const f of files){
    const filePath = path.join(CATALOG_DIR,f);
    let list = readJson(filePath);
    const cleaned = [];

    for(const item of list){
      // remove item inválido
      if(!item || !item.sku || !item.title || !item.category){
        removed++;
        continue;
      }

      // garante preço
      if(item.price == null || item.price <= 0){
        item.price = item.price ?? 0;
      }

      // garante estoque
      if(item.stock == null){
        item.stock = randStock();
      }

      // flag de prontidão para UX
      item.ready = true;
      item.updatedAt = Date.now();

      cleaned.push(item);
      fixed++;
    }

    writeJson(filePath, cleaned);
  }

  console.log(`[FINAL-CLEAN] Concluído. Itens ajustados=${fixed} | Removidos=${removed}`);
}

main().catch(e=>{
  console.error("[FINAL-CLEAN] ERRO:", e.message);
  process.exit(1);
});