import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_DIR = path.join(__dirname, "..", "data", "catalog");
const INDEX_PATH = path.join(CATALOG_DIR, "index.json");

// =========================
// Normalização
// =========================
function norm(v) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const STOPWORDS = new Set([
  "e", "de", "da", "do", "para", "pra", "com", "sem", "um", "uma", "o", "a", "os", "as",
  "no", "na", "nos", "nas", "por", "em"
]);

function tokenize(q) {
  return norm(q)
    .split(/\s+/)
    .filter(t => t && !STOPWORDS.has(t));
}

// =========================
// Cache (simples e rápido)
// =========================
let _indexCache = null;
const _fileCache = new Map();

function loadIndex() {
  if (_indexCache) return _indexCache;
  const raw = fs.readFileSync(INDEX_PATH, "utf-8");
  _indexCache = JSON.parse(raw);
  return _indexCache;
}

function loadCategoryFile(file) {
  if (_fileCache.has(file)) return _fileCache.get(file);
  const abs = path.join(CATALOG_DIR, file);
  if (!fs.existsSync(abs)) return [];
  const data = JSON.parse(fs.readFileSync(abs, "utf-8"));
  const arr = Array.isArray(data) ? data : (data?.products || []);
  _fileCache.set(file, arr);
  return arr;
}

// =========================
// Dicionário de intenções (pesado)
// =========================
const BRAND_WORDS = new Set([
  "razer","logitech","corsair","hyperx","redragon","steelseries","asus","msi","gigabyte",
  "intel","amd","nvidia","samsung","lg","dell","lenovo","acer","apple","xiaomi","motorola",
  "kingston","crucial","wd","western","seagate","sandisk","synology","qnap","tplink","tp-link",
  "intelbras","philips","tcl","aoc","nzxt","deepcool","cooler","master","evga","xpg","amazfit",
  "8bitdo","microsoft","sony"
]);

// Palavras por “tipo”
const TYPE_RULES = [
  // Periféricos
  { cat: "Teclado", match: ["teclado", "keyboard", "keycap", "switch", "mecanico", "mecânico"] },
  { cat: "Mouse", match: ["mouse", "mice"] },
  { cat: "Mousepad", match: ["mousepad", "pad", "deskmat", "desk mat"] },
  { cat: "Headset", match: ["headset", "fone", "headphone", "auricular"] },
  { cat: "Webcam", match: ["webcam", "camera usb", "câmera usb", "camera"] },
  { cat: "Microfone", match: ["microfone", "mic", "microphone"] },
  { cat: "Caixa de Som", match: ["caixa de som", "speaker", "soundbar", "sound bar"] },

  // Display
  { cat: "Monitor", match: ["monitor", "display", "ips", "144hz", "240hz", "ultrawide", "qhd"] },
  { cat: "TV", match: ["tv", "smart tv", "oled", "qled", "uhd", "4k", "8k"] },
  { cat: "Projetor", match: ["projetor", "projector"] },

  // Computadores prontos
  { cat: "Notebook", match: ["notebook", "laptop", "macbook"] },
  { cat: "Desktop", match: ["desktop", "pc gamer", "computador", "cpu gamer"] },
  { cat: "Mini PC", match: ["mini pc", "nuc"] },
  { cat: "Workstation", match: ["workstation", "precision", "z2", "z4"] },

  // Componentes
  { cat: "GPU", match: ["gpu", "placa de video", "placa de vídeo", "rtx", "gtx", "radeon"] },
  { cat: "CPU", match: ["cpu", "processador", "ryzen", "threadripper", "core i", "i3", "i5", "i7", "i9"] },
  { cat: "Placa-mãe", match: ["placa mae", "placa-mãe", "motherboard", "b450", "b550", "b660", "z690", "x570"] },
  { cat: "Memória RAM", match: ["ram", "memoria", "memória", "ddr4", "ddr5", "so-dimm", "sodimm"] },
  { cat: "SSD", match: ["ssd", "nvme", "m.2", "m2", "sata ssd"] },
  { cat: "HDD", match: ["hdd", "hd", "7200rpm", "5400rpm"] },
  { cat: "Fonte (PSU)", match: ["fonte", "psu", "power supply", "650w", "750w", "850w", "1000w"] },
  { cat: "Gabinete", match: ["gabinete", "case", "mid tower", "full tower"] },
  { cat: "Cooler / Water Cooler", match: ["cooler", "water cooler", "aio", "radiador", "fan", "ventoinha"] },
  { cat: "Pasta térmica", match: ["pasta termica", "pasta térmica", "thermal paste"] },

  // Rede
  { cat: "Roteador", match: ["roteador", "router", "wi-fi", "wifi", "mesh"] },
  { cat: "Repetidor Wi-Fi", match: ["repetidor", "extensor", "range extender"] },
  { cat: "Switch", match: ["switch", "8 portas", "16 portas"] },
  { cat: "Modem", match: ["modem"] },
  { cat: "Placa de Rede", match: ["placa de rede", "ethernet", "wifi usb", "adaptador wifi", "adaptador wi-fi", "bluetooth usb"] },

  // Mobile
  { cat: "Smartphone", match: ["smartphone", "celular", "iphone", "galaxy", "redmi", "moto g", "motorola"] },
  { cat: "Tablet", match: ["tablet", "ipad"] },
  { cat: "Smartwatch", match: ["smartwatch", "watch", "mi band", "galaxy watch", "amazfit"] },
  { cat: "Acessórios Mobile", match: ["capa", "capinha", "pelicula", "película", "carregador", "cabo", "usb-c", "type-c", "suporte veicular"] },

  // Armazenamento & mídia
  { cat: "Pen Drive", match: ["pen drive", "pendrive", "flash drive"] },
  { cat: "Cartão de Memória", match: ["cartao", "cartão", "micro sd", "microsd", "sd card"] },
  { cat: "HD Externo", match: ["hd externo", "external hdd"] },
  { cat: "SSD Externo", match: ["ssd externo", "external ssd"] },
  { cat: "NAS", match: ["nas", "diskstation", "synology", "qnap"] },

  // Games
  { cat: "Console", match: ["console", "ps5", "ps4", "xbox", "switch"] },
  { cat: "Controle (Gamepad)", match: ["controle", "gamepad", "dualsense", "dualshock"] },
  { cat: "Acessórios para Console", match: ["base carregadora", "dock", "volante", "hd camera", "camera ps5"] }
];

function inferCategoryFromText(p) {
  const text = norm([p?.title, p?.brand, p?.tags?.join?.(" "), p?.category].filter(Boolean).join(" "));
  for (const rule of TYPE_RULES) {
    for (const w of rule.match) {
      if (text.includes(norm(w))) return rule.cat;
    }
  }
  return p?.category || "";
}

// =========================
// Busca inteligente (score)
// =========================
function scoreProduct(p, tokens, intentBrands) {
  const hay = norm([p?.title, p?.brand, p?.category, (p?.tags || []).join(" ")].join(" "));
  let score = 0;

  for (const t of tokens) {
    if (!t) continue;
    if (hay.includes(t)) score += 2;
    // match “forte” em title
    if (p?.title && norm(p.title).includes(t)) score += 2;
  }

  // marca
  if (intentBrands.size) {
    const b = norm(p?.brand || "");
    if (intentBrands.has(b)) score += 7;
  }

  // boost se categoria bate muito bem com o texto do produto
  const cat = norm(p?.category || "");
  if (cat.includes("teclad") && hay.includes("teclad")) score += 3;
  if (cat.includes("mouse") && hay.includes("mouse")) score += 3;
  if (cat.includes("gpu") && (hay.includes("rtx") || hay.includes("gtx") || hay.includes("radeon"))) score += 3;
  if (cat.includes("cpu") && (hay.includes("ryzen") || hay.includes("intel") || hay.includes("core"))) score += 3;

  return score;
}

// =========================
// Controller
// =========================
export function searchController(req, res) {
  try {
    const qRaw = (req.query.q || "").toString();
    const q = norm(qRaw);
    const tokens = tokenize(q);

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 60);

    // Detecta marcas mencionadas
    const intentBrands = new Set();
    for (const t of tokens) {
      if (BRAND_WORDS.has(t)) intentBrands.add(t);
    }

    // Carrega tudo do catálogo modular
    const index = loadIndex();
    const categories = Array.isArray(index?.categories) ? index.categories : [];

    let catalog = [];
    for (const c of categories) {
      if (!c?.file) continue;
      catalog.push(...loadCategoryFile(c.file));
    }

    // Corrige categoria na saída (sem mexer nos arquivos)
    // ✅ Isso resolve teclado com imagem de GPU no seu front.
    const fixed = catalog.map((p) => {
      const original = p?.category || "";
      const corrected = inferCategoryFromText(p);

      // devolve categoria corrigida + guarda a antiga só pra debug
      if (corrected && corrected !== original) {
        return { ...p, category: corrected, _catOriginal: original };
      }
      return p;
    });

    // Se não tem query, retorna pagina simples
    let results = fixed;

    if (tokens.length) {
      results = fixed
        .map((p) => {
          const s = scoreProduct(p, tokens, intentBrands);
          return { ...p, _score: s };
        })
        .filter((p) => p._score > 0)
        .sort((a, b) => b._score - a._score);
    }

    const total = results.length;
    const start = (page - 1) * limit;
    const produtos = results.slice(start, start + limit);

    return res.json({
      ok: true,
      query: qRaw,
      total,
      page,
      limit,
      produtos
    });
  } catch (e) {
    console.error("[SEARCH ERROR]", e?.message || e);
    return res.status(500).json({ ok: false, error: "SEARCH_FAILED" });
  }
}
