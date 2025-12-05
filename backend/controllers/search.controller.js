// backend/controllers/search.controller.js

export const searchController = {
  demo: (req, res) => {
    // pega o termo tanto do body (POST) quanto da query (GET)
    const termo =
      (req.body && req.body.query) ||
      req.query.q ||
      "produto eletrônico";

    const resultadosFake = [
      {
        title: `${termo} - Loja A (exemplo)`,
        store: "Loja A",
        price: 199.9,
      },
      {
        title: `${termo} - Loja B (exemplo)`,
        store: "Loja B",
        price: 219.9,
      },
      {
        title: `${termo} - Loja C (exemplo)`,
        store: "Loja C",
        price: 249.9,
      },
    ];

    res.json({
      ok: true,
      query: termo,
      results: resultadosFake,
      mode: "demo",
    });
  },
};
