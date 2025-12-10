// backend/controllers/search.controller.js

import fetch from "node-fetch";

export const searchController = {
  demo: async (req, res) => {
    try {
      // termo que veio do front (body ou querystring)
      const termo =
        (req.body && req.body.query) ||
        req.query.q ||
        "monitor";

      // 1) Monta URL da API DummyJSON (produtos fake, mas com campos reais)
      const url = new URL("https://dummyjson.com/products/search");
      url.searchParams.set("q", termo);

      const resposta = await fetch(url.toString());
      const data = await resposta.json();

      // Só pra debug, se quiser ver no terminal
      console.log("DummyJSON status:", resposta.status);

      if (!resposta.ok) {
        return res.status(500).json({
          ok: false,
          error: "Erro ao consultar DummyJSON",
          details: {
            status: resposta.status,
            body: data,
          },
        });
      }

      // 2) A API usa "products" em vez de "results"
      const itens = Array.isArray(data.products) ? data.products : [];

      // 3) Mapear para o formato padrão do Nexus
      const resultados = itens.map((item) => {
        // tenta inventar um "originalPrice" a partir do desconto
        let originalPrice = null;
        if (typeof item.price === "number" && typeof item.discountPercentage === "number") {
          originalPrice =
            item.price / (1 - item.discountPercentage / 100);
        }

        return {
          id: item.id,
          title: item.title,
          store: "Loja Demo (DummyJSON)",
          price: item.price,
          originalPrice: originalPrice ? Number(originalPrice.toFixed(2)) : null,
          image: item.thumbnail,
          permalink: `https://dummyjson.com/products/${item.id}`,
          freeShipping: false,
          bestOffer: false,
        };
      });

      // 4) Resposta final pro front
      res.json({
        ok: true,
        mode: "real",
        provider: "dummyjson",
        query: termo,
        total: resultados.length,
        results: resultados,
      });
    } catch (erro) {
      console.error("Erro na busca real (DummyJSON):", erro);
      res.status(500).json({
        ok: false,
        error: "Erro interno ao buscar produtos reais.",
      });
    }
  },
};
