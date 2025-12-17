import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===============================
   CARREGA CATÁLOGO
================================ */
function carregarCatalogo() {
  try {
    const caminhos = [
      path.join(__dirname, "..", "data", "catalogo.json"),
      path.join(process.cwd(), "backend", "data", "catalogo.json"),
      path.join(process.cwd(), "data", "catalogo.json"),
    ];

    for (const p of caminhos) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw);
      }
    }

    console.warn("[SEARCH] catálogo.json não encontrado");
    return [];
  } catch (err) {
    console.error("[SEARCH] Erro ao carregar catálogo:", err);
    return [];
  }
}

/* ===============================
   NORMALIZA TEXTO
================================ */
function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* ===============================
   ROTACAO DIARIA (SEED)
================================ */
function getDailySeed() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/* ===============================
   SHUFFLE COM SEED
================================ */
function shuffle(array, seed) {
  let currentIndex = array.length;
  let random;
  let s = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

  while (currentIndex !== 0) {
    random = Math.floor(Math.abs(Math.sin(s++)) * currentIndex);
    currentIndex--;
    [array[currentIndex], array[random]] = [
      array[random],
      array[currentIndex],
    ];
  }

  return array;
}

/* ===============================
   CONTROLLER
================================ */
export const searchController = {
  catalog(req, res) {
    try {
      const q = normalize(req.query.q || "");
      const plan = (req.query.plan || "free").toLowerCase();

      let produtos = carregarCatalogo();

      /* ===== BUSCA TEXTO ===== */
      if (q) {
        produtos = produtos.filter((p) => {
          const texto =
            normalize(p.title) +
            " " +
            normalize(p.subtitle) +
            " " +
            normalize(p.brand) +
            " " +
            normalize(p.category) +
            " " +
            normalize(p.description) +
            " " +
            normalize((p.tags || []).join(" "));

          return texto.includes(q);
        });
      }

      /* ===== BLOQUEIO INTELIGENTE ===== */
      if (plan === "free") {
        const seed = getDailySeed();

        // Embaralha todo dia
        produtos = shuffle(produtos, seed);

        // FREE vê só 30% do catálogo
        const limite = Math.max(1, Math.floor(produtos.length * 0.3));
        produtos = produtos.slice(0, limite);
      }

      return res.json({
        ok: true,
        total: produtos.length,
        produtos,
      });
    } catch (err) {
      console.error("[SEARCH] ERRO:", err);
      return res.status(500).json({
        ok: false,
        error: "Erro interno na busca",
      });
    }
  },
};
