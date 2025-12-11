// backend/controllers/search.controller.js
import fetch from "node-fetch";

const ML_ACCESS_TOKEN = process.env.ML_ACCESS_TOKEN;

export const searchController = {
  real: async (req, res) => {
    try {
      const termo =
        (req.body && req.body.query) ||
        req.query.q ||
        "notebook gamer";

      if (!ML_ACCESS_TOKEN) {
        return res.status(500).json({
          ok: false,
          error: "ML_ACCESS_TOKEN não configurado no .env",
        });
      }

      const url = new URL("https://api.mercadolibre.com/sites/MLB/search");
      url.searchParams.set("q", termo);
      url.searchParams.set("limit", "12");

      const resposta = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${ML_ACCESS_TOKEN}`,
        },
      });

      const data = await resposta.json();
      console.log("ML search status:", resposta.status);

      if (!resposta.ok) {
        return res.status(500).json({
          ok: false,
          error: "Erro ao consultar Mercado Livre",
          details: {
            status: resposta.status,
            body: data,
          },
        });
      }

      const itens = Array.isArray(data.results) ? data.results : [];

      const resultados = itens.map((item) => {
        const imagem =
          (Array.isArray(item.pictures) && item.pictures[0]?.secure_url) ||
          item.thumbnail ||
          null;

        return {
          id: item.id,
          title: item.title,
          store: item.seller?.nickname || "Mercado Livre",
          price: item.price,
          originalPrice: null,
          image: imagem,
          permalink: item.permalink,
          freeShipping: item.shipping?.free_shipping || false,
          bestOffer: false,
        };
      });

      res.json({
        ok: true,
        mode: "real",
        provider: "mercadolivre",
        query: termo,
        total: resultados.length,
        results: resultados,
      });
    } catch (erro) {
      console.error("Erro na busca real (Mercado Livre):", erro);
      res.status(500).json({
        ok: false,
        error: "Erro interno ao buscar produtos reais no Mercado Livre.",
      });
    }
  },
};
