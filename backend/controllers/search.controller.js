// backend/controllers/search.controller.js

import fetch from "node-fetch";

export const searchController = {
  real: async (req, res) => {
    try {
      // Termo que veio do front (body ou query)
      const termo =
        (req.body && req.body.query) ||
        req.query.q ||
        "monitor";

      // Chama a API da DummyJSON
      const url = new URL("https://dummyjson.com/products/search");
      url.searchParams.set("q", termo);

      const resposta = await fetch(url.toString());
      const data = await resposta.json();

      console.log("DummyJSON search status:", resposta.status);

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

      // Lista principal de produtos
      let itens = Array.isArray(data.products) ? data.products : [];

      // 🔁 Plano B: se não achou nada com o termo, pega produtos genéricos
      if (!itens.length) {
        const fallbackResp = await fetch("https://dummyjson.com/products?limit=12");
        const fallbackData = await fallbackResp.json();

        if (fallbackResp.ok && Array.isArray(fallbackData.products)) {
          itens = fallbackData.products;
        }
      }

      // Mapeia pro formato Nexus
      const resultados = itens.map((item) => {
        let originalPrice = null;
        if (
          typeof item.price === "number" &&
          typeof item.discountPercentage === "number"
        ) {
          const calc = item.price / (1 - item.discountPercentage / 100);
          originalPrice = Number(calc.toFixed(2));
        }

        return {
          id: item.id,
          title: item.title,
          store: "Loja Demo (DummyJSON)",
          price: item.price,
          originalPrice,
          image: item.thumbnail,
          permalink: `https://dummyjson.com/products/${item.id}`,
          freeShipping: false,
          bestOffer: false,
        };
      });

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
