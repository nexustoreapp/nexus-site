// backend/controllers/search.controller.js

// Vamos usar fetch nativo do Node 18+.
// Se seu Node for mais antigo, dá pra trocar por 'node-fetch'.

export const searchController = {
  demo: async (req, res) => {
    try {
      // 1) Descobrir o termo de busca vindo do front
      const termo =
        (req.body && req.body.query) ||
        req.query.q ||
        "notebook gamer";

      // 2) Chamar a API REAL do Mercado Livre Brasil
      const url = new URL("https://api.mercadolibre.com/sites/MLB/search");
      url.searchParams.set("q", termo);
      url.searchParams.set("limit", "12"); // máximo de 12 resultados

      const resposta = await fetch(url.toString());
      const data = await resposta.json();

      // 3) Tratar erros básicos
      if (!resposta.ok) {
        return res.status(500).json({
          ok: false,
          error: "Erro ao consultar Mercado Livre",
          details: data,
        });
      }

      const itens = Array.isArray(data.results) ? data.results : [];

      // 4) Mapear o formato do Mercado Livre → formato do Nexus
      const resultados = itens.map((item) => ({
        id: item.id,
        title: item.title,
        store: item.seller?.nickname || "Vendedor Mercado Livre",
        price: item.price,
        originalPrice: item.original_price || null,
        image: item.thumbnail,
        permalink: item.permalink,
        freeShipping: item.shipping?.free_shipping || false,
        bestOffer: false, // dá pra inventar uma lógica depois
      }));

      // 5) Resposta para o front
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
