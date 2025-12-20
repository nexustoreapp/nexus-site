import fs from "fs";
import path from "path";
import { parse } from "csv-parse";

const PROJECT_ROOT = process.cwd();
const DATASETS_DIR = path.join(PROJECT_ROOT, "datasets");
const OUTPUT = path.join(PROJECT_ROOT, "backend", "data", "catalogo.json");
const BACKUP = path.join(PROJECT_ROOT, "backend", "data", `catalogo.backup.${Date.now()}.json`);

/* =========================
   Helpers
========================= */
const safeReadJSON = (p, fallback) => {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
};

const norm = (s) =>
  String(s ?? "")
    .replace(/\s+/g, " ")
    .replace(/\u0000/g, "")
    .trim();

const normKey = (s) =>
  norm(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const toNumber = (v) => {
  const s = norm(v).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const slug = (s) =>
  norm(s)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const pickFirst = (...vals) => {
  for (const v of vals) {
    const s = norm(v);
    if (s) return s;
  }
  return "";
};

/* =========================
   Categoria mapper (Nexus)
========================= */
function mapCategory(rawCat, title) {
  const hay = `${rawCat} ${title}`.toLowerCase();

  if (hay.includes("headset") || hay.includes("headphone") || hay.includes("fone")) return "Headset";
  if (hay.includes("keyboard") || hay.includes("teclado")) return "Teclado";
  if (hay.includes("mouse")) return "Mouse";
  if (hay.includes("monitor") || hay.includes("display")) return "Monitor";
  if (hay.includes("notebook") || hay.includes("laptop")) return "Notebook";
  if (hay.includes("gpu") || hay.includes("graphics") || hay.includes("rtx") || hay.includes("radeon")) return "Placa de Vídeo";
  if (hay.includes("cpu") || hay.includes("processor") || hay.includes("ryzen") || hay.includes("core i")) return "Processador";
  if (hay.includes("ssd") || hay.includes("nvme")) return "SSD";
  if (hay.includes("ram") || hay.includes("ddr")) return "Memória RAM";
  if (hay.includes("webcam")) return "Webcam";
  if (hay.includes("microphone") || hay.includes("microfone")) return "Microfone";
  if (hay.includes("router") || hay.includes("roteador")) return "Roteador";
  if (hay.includes("speaker") || hay.includes("caixa de som")) return "Caixa de Som";
  if (hay.includes("controller") || hay.includes("controle")) return "Controle";
  if (hay.includes("vr") || hay.includes("quest") || hay.includes("oculos")) return "VR";

  // Se não bater, joga num “Outros” pra não perder produto
  return "Outros";
}

/* =========================
   Tier + preço (heurística)
   (preço real você ajusta depois)
========================= */
function tierByCategory(cat) {
  // categorias “premium” sobem tier
  if (["Placa de Vídeo", "VR"].includes(cat)) return "hyper";
  if (["Notebook", "Monitor"].includes(cat)) return "core";
  return "free";
}

function priceBand(cat) {
  // preços “plausíveis” em BRL só pra não ficar 0
  switch (cat) {
    case "Headset": return [129, 1299];
    case "Teclado": return [99, 999];
    case "Mouse": return [59, 799];
    case "Monitor": return [599, 3999];
    case "Notebook": return [1999, 12999];
    case "Placa de Vídeo": return [999, 12999];
    case "Processador": return [499, 5999];
    case "SSD": return [149, 1499];
    case "Memória RAM": return [129, 1299];
    case "Webcam": return [99, 1299];
    case "Microfone": return [99, 1999];
    case "Roteador": return [99, 1499];
    case "Caixa de Som": return [99, 2999];
    case "Controle": return [99, 799];
    case "VR": return [1499, 6999];
    default: return [49, 1999];
  }
}

function randBetween(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

/* =========================
   CSV streaming reader
========================= */
function readCsvRows(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, relax_quotes: true, relax_column_count: true, skip_empty_lines: true }))
      .on("data", (r) => rows.push(r))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

/* =========================
   Row -> Product adapter (multi-dataset)
========================= */
function rowToProduct(row, sourceFile) {
  // tenta pegar “nome” de várias colunas comuns
  const title =
    pickFirst(
      row.title,
      row.Title,
      row.ProductName,
      row.name,
      row.prod_name,
      row["name"],
      row["product_name"],
      row["product title"]
    );

  if (!title) return null;

  const brand =
    pickFirst(row.brand, row.Brand, row.manufacturer, row.manufactur, row["Brand Name"]);

  // categoria vinda do dataset (às vezes vem gigante “categories”)
  const rawCat =
    pickFirst(
      row.category,
      row.Category,
      row.main_category,
      row.sub_category,
      row.category_code,
      row.categories,
      row.categoryCode,
      row.cat_id
    );

  const category = mapCategory(rawCat, title);

  // ignora datasets de “event log” (electronics.csv etc) que não trazem produto real
  // (aqui passa pq tem title; mas se vier com event_type, a gente corta)
  if (row.event_type || row.user_session) return null;

  // preço: tenta várias colunas; se não achar, gera plausível
  const priceCandidate =
    toNumber(row.price) ??
    toNumber(row.Price) ??
    toNumber(row.prices_amountmin) ??
    toNumber(row.prices_amountmax) ??
    toNumber(row["discount_price (INR)"]) ??
    toNumber(row["actual_price (INR)"]) ??
    toNumber(row.prod_price);

  const tier = (row.tier ? String(row.tier).toLowerCase() : tierByCategory(category));
  const [minP, maxP] = priceBand(category);
  const pricePublic = priceCandidate && priceCandidate > 0 ? Number(priceCandidate) : randBetween(minP, maxP);
  const pricePremium = Math.max(0, Math.round((pricePublic * 0.93) * 100) / 100);

  // tags simples
  const tags = Array.from(
    new Set(
      [
        ...norm(title).toLowerCase().split(/\s+/).slice(0, 8),
        norm(brand).toLowerCase(),
        category.toLowerCase(),
      ].filter(Boolean)
    )
  ).slice(0, 12);

  return {
    __source: sourceFile,
    title: norm(title),
    brand: norm(brand) || "Genérico",
    category,
    subtitle: "",
    description: "",
    tags,
    tier: ["free", "core", "hyper", "omega"].includes(tier) ? tier : "free",
    pricePublic,
    pricePremium,
    featured: false,
    images: []
  };
}

/* =========================
   Main
========================= */
(async () => {
  if (!fs.existsSync(DATASETS_DIR)) {
    console.log(`[ERRO] Pasta datasets/ não existe. Crie e coloque os CSVs dentro.`);
    process.exit(1);
  }

  const existing = safeReadJSON(OUTPUT, []);
  if (!Array.isArray(existing)) {
    console.log(`[ERRO] catalogo.json atual não é um array JSON válido.`);
    process.exit(1);
  }

  // backup
  fs.writeFileSync(BACKUP, JSON.stringify(existing, null, 2), "utf8");
  console.log(`[OK] Backup criado: ${path.relative(PROJECT_ROOT, BACKUP)}`);

  // índice pra não duplicar
  const seen = new Set();
  for (const p of existing) {
    const k = `${normKey(p.title)}|${normKey(p.brand)}|${normKey(p.category)}`;
    seen.add(k);
  }

  // id counter baseado no que já existe
  let counter = existing.length + 1;

  const files = fs.readdirSync(DATASETS_DIR).filter(f => f.toLowerCase().endsWith(".csv"));
  console.log(`[INFO] CSVs encontrados em datasets/: ${files.length}`);

  let added = 0;
  const out = [...existing];

  for (const f of files) {
    const full = path.join(DATASETS_DIR, f);
    console.log(`\n[LOAD] ${f}`);

    let rows = [];
    try {
      rows = await readCsvRows(full);
    } catch (e) {
      console.log(`[SKIP] Falhou ler ${f}: ${e.message}`);
      continue;
    }

    console.log(`[INFO] Linhas lidas: ${rows.length}`);

    for (const row of rows) {
      const p = rowToProduct(row, f);
      if (!p) continue;

      const k = `${normKey(p.title)}|${normKey(p.brand)}|${normKey(p.category)}`;
      if (seen.has(k)) continue;

      // gera id estável
      const base = `${p.category}-${p.brand}-${p.title}`;
      p.id = `${slug(base).slice(0, 42)}-${String(counter++).padStart(6, "0")}`;

      seen.add(k);
      out.push(p);
      added++;
    }

    console.log(`[OK] Acumulado adicionados: ${added}`);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2), "utf8");
  console.log(`\n[DONE] Catalogo final: ${out.length} produtos (adicionados: ${added})`);
  console.log(`[OUT] ${path.relative(PROJECT_ROOT, OUTPUT)}`);
})();
