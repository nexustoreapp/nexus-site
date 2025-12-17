// backend/controllers/search.controller.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminhos possíveis do catálogo (local + Render)
const POSSIBLE_PATHS = [
  path.join(__dirname, "..", "data", "catalogo.json"),
  path.join(process.cwd(), "backend", "data", "catalogo.json"),
  path.join(process.cwd(), "data", "catalogo.json"),
];

let catalogo = [];

// Carregar catálogo
for (const p of POSSIBLE_PATHS) {
  try {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      catalogo = JSON.parse(raw);
      console.log("[NEXUS] Catálogo carregado com sucesso:", p);
      break;
    }
  } catch (e) {
    console.warn("[NEXUS] Falha ao tentar carregar:", p);
  }
}

if (!catalogo.length) {
  console.error("[NEXUS] ATENÇÃO: Catálogo NÃO foi carregado.");
}

export const searchController = {
  catalog: (req, res) => {
    try {
      const q = (req.query.q || "").toLowerCase();

      if (!q) {
        return res.json({
          ok: true,
          total: catalogo.length,
          produtos: catalogo,
        });
      }

      const resultados = catalogo.filter((item) =>
        Object.values(item).some(
          (v) =>
            typeof v === "string" &&
            v.toLowerCase().includes(q)
        )
      );

      return res.json({
        ok: true,
        total: resultados.length,
        produtos: resultados,
      });
    } catch (erro) {
      console.error("[NEXUS] Erro na busca:", erro);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao buscar produtos.",
      });
    }
  },
};
