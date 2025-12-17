import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const searchController = {
  catalog(req, res) {
    try {
      const q = normalize(req.query.q || "");
      const plan = (req.query.plan || "free").toLowerCase();

      const catalogo = carregarCatalogo();

      if (!q) {
        return res.json({
          ok: true,
          total: catalogo.length,
          produtos: catalogo,
        });
      }

      const rank = { free: 0, core: 1, hyper: 2, omega: 3 };
      const userRank = rank[plan] ?? 0;

      const resultados = catalogo
        .filter((p) => {
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
        })
        .filter((p) => {
          const itemRank = rank[p.tier || "free"] ?? 0;
          return userRank >= itemRank;
        })
        .slice(0, 120);

      return res.json({
        ok: true,
        total: resultados.length,
        produtos: resultados,
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
