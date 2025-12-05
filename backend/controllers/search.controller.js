// backend/controllers/search.controller.js

export const searchController = {
  demoSearch: (req, res) => {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        ok: false,
        error: "Envie um termo de busca em 'query'.",
      });
    }

    // Resultado totalmente fictício só para teste
    res.json({
      ok: true,
      query,
      results: [
        {
          id: "demo_1",
          title: `${query} - Loja A (exemplo)`,
          price: 199.9,
          store: "Loja A (fake)",
        },
        {
          id: "demo_2",
          title: `${query} - Loja B (exemplo)`,
          price: 209.9,
          store: "Loja B (fake)",
        },
        {
          id: "demo_3",
          title: `${query} - Loja C (exemplo)`,
          price: 215.5,
          store: "Loja C (fake)",
        },
      ],
      message:
        "Resultados de demonstração. No futuro, aqui vamos ligar com as APIs reais das lojas.",
    });
  },
};
