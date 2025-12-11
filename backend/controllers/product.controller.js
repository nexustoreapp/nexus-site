// backend/controllers/product.controller.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho do catálogo
const catalogPath = path.join(__dirname, "..", "data", "catalogo.json");

let catalogo = [];

// Carrega o catálogo na subida do servidor
try {
  const raw = fs.readFileSync(catalogPath, "utf-8");
  catalogo = JSON.parse(raw);
  console.log(`[NEXUS] Catálogo (produto.controller) carregado com ${catalogo.length} produto(s).`);
} catch (e) {
  console.error("[NEXUS] Erro ao carregar catalogo.json em product.controller:", e.message);
  catalogo = [];
}

// Busca produto por ID
function encontrarPorId(id) {
  return catalogo.find((item) => item.id === id);
}

export const productController = {
  // GET /api/product/:id
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Nenhum ID de produto informado.",
        });
      }

      const produto = encontrarPorId(id);

      if (!produto) {
        return res.status(404).json({
          ok: false,
          error: "Produto não encontrado no catálogo Nexus.",
        });
      }

      // Aqui no futuro dá pra adaptar dependendo do plano do usuário (Core / Hyper / Omega)
      return res.json({
        ok: true,
        mode: "catalogo_nexus",
        product: {
          id: produto.id,
          title: produto.title,
          subtitle: produto.subtitle,
          description: produto.description,
          category: produto.category,
          tags: produto.tags || [],
          pricePublic: produto.pricePublic,
          pricePremium: produto.pricePremium,
          images: produto.images || [],
          stock: produto.stock,
          premiumOnly: !!produto.premiumOnly,
          omegaExclusive: !!produto.omegaExclusive,
          supplier: produto.supplier || null,
          shipping: produto.shipping || null,
          comboEligible: !!produto.comboEligible,
          createdAt: produto.createdAt || null,
        },
      });
    } catch (erro) {
      console.error("[NEXUS] Erro ao buscar produto por ID:", erro);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao buscar produto.",
      });
    }
  },

  // GET /api/product (lista todos - opcional, mas já deixo pronto)
  listAll: async (_req, res) => {
    try {
      return res.json({
        ok: true,
        mode: "catalogo_nexus",
        total: catalogo.length,
        products: catalogo,
      });
    } catch (erro) {
      console.error("[NEXUS] Erro ao listar produtos:", erro);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao listar produtos.",
      });
    }
  },
};
