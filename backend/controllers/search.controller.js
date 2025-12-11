// backend/controllers/search.controller.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho do catálogo
const catalogPath = path.join(__dirname, "..", "data", "catalogo.json");

let catalogo = [];

// Carrega o catálogo na memória na subida do servidor
try {
  const raw = fs.readFileSync(catalogPath, "utf-8");
  catalogo = JSON.parse(raw);
  console.log(`[NEXUS] Catálogo carregado com ${catalogo.length} produto(s).`);
} catch (e) {
  console.error("[NEXUS] Erro ao carregar catalogo.json:", e.message);
  catalogo = [];
}

// Função simples pra normalizar string (sem acento, minúsculo)
function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Faz a busca no catálogo
function buscarNoCatalogo(termo) {
  const tNorm = normalize(termo);

  if (!tNorm) {
    // Se não tiver termo, podemos retornar tudo ou nada.
    // Aqui vou retornar tudo, mas limitado a 50 pra não explodir.
    return catalogo.slice(0, 50);
  }

  const resultados = catalogo.filter((item) => {
    const titulo = normalize(item.title);
    const subtitulo = normalize(item.subtitle || "");
    const categoria = normalize(item.category || "");
    const tags = Array.isArray(item.tags)
      ? normalize(item.tags.join(" "))
      : "";

    return (
      titulo.includes(tNorm) ||
      subtitulo.includes(tNorm) ||
      categoria.includes(tNorm) ||
      tags.includes(tNorm)
    );
  });

  // Ordena por pricePremium crescente (quem é premium vê mais vantagem)
  resultados.sort((a, b) => {
    const pa = a.pricePremium ?? a.pricePublic ?? 0;
    const pb = b.pricePremium ?? b.pricePublic ?? 0;
    return pa - pb;
  });

  return resultados;
}

export const searchController = {
  // GET /api/search
  catalog: async (req, res) => {
    try {
      const termo =
        (req.query && req.query.q) ||
        (req.body && req.body.query) ||
        "";

      const encontrados = buscarNoCatalogo(termo);

      const resposta = {
        ok: true,
        mode: "catalogo_nexus",
        query: termo,
        total: encontrados.length,
        results: encontrados.map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          category: item.category,
          tags: item.tags || [],
          pricePublic: item.pricePublic,
          pricePremium: item.pricePremium,
          images: item.images || [],
          stock: item.stock,
          premiumOnly: !!item.premiumOnly,
          omegaExclusive: !!item.omegaExclusive,
          // infos pra IA / painel futuro
          supplier: {
            name: item.supplier?.name || null,
            cost: item.supplier?.cost ?? null,
            shippingCost: item.supplier?.shippingCost ?? null,
            deliveryTime: item.supplier?.deliveryTime || null,
          },
          shipping: item.shipping || null,
          comboEligible: !!item.comboEligible,
        })),
      };

      return res.json(resposta);
    } catch (erro) {
      console.error("[NEXUS] Erro na busca do catálogo:", erro);
      return res.status(500).json({
        ok: false,
        error: "Erro interno ao buscar produtos no catálogo Nexus.",
      });
    }
  },
};
