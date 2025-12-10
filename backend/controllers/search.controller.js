// backend/controllers/search.controller.js

import fetch from "node-fetch";

export const searchController = {
  demo: async (req, res) => {
    try {
      // 1) Termo que veio do front
      const termo =
        (req.body && req.body.query) ||
        req.query.q ||
        "notebook gamer";

      // 2) Monta URL da API REAL do Mercado Livre Brasil
      const url = new URL("https://api.mercadolibre.com/sites/MLB/search");
      url.searchParams.set("q", termo);
      url.searchParams.set("limit", "12"); // até 12 resultados

      const resposta = await fetch(url.toString());
      const data = await resposta.json();

      if (!resposta.ok) {
        return res.status(500).json({
          ok: false,
          error: "Erro ao consultar Mercado Livre",
          details: data,
        });
      }

      const itens = Array.isArray(data.results) ? data.results : [];

      // 3) Mapeia o formato do Mercado Livre → formato do Nexus
      const resultados = itens.map((item) => ({
        id: item.id,
        title: item.title,
        store: item.seller?.nickname || "Vendedor Mercado Livre",
        price: item.price,
        originalPrice: item.original_price || null,
        image: item.thumbnail,
        permalink: item.permalink,
        freeShipping: item.shipping?.free_shipping || false,
        bestOffer: false, // depois podemos melhorar essa lógica
      }));

      // 4) Resposta final pro front
      res.json({
        ok: true,
        mode: "real",
        provider: "mercado_livre",
        query: termo,
        total: resultados.length,
        results: resultados,
      });
    } catch (erro) {
      console.error("Erro na busca real:", erro);
      res.status(500).json({
        ok: false,
        error: "Erro interno ao buscar produtos reais.",
      });
    }
  },
};
