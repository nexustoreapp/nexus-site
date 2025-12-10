// backend/controllers/product.controller.js

import fetch from "node-fetch";

export const productController = {
  real: async (req, res) => {
    try {
      const id = req.query.id;

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Parâmetro 'id' é obrigatório. Ex: /api/product?id=1",
        });
      }

      // 1) Buscar detalhes do produto na DummyJSON
      const resp = await fetch(
        `https://dummyjson.com/products/${encodeURIComponent(id)}`
      );
      const item = await resp.json();

      console.log("DummyJSON product status:", resp.status);

      if (!resp.ok) {
        return res.status(500).json({
          ok: false,
          error: "Erro ao buscar detalhes do produto na DummyJSON",
          details: {
            status: resp.status,
            body: item,
          },
        });
      }

      // 2) Montar um objeto no formato que o produto.js espera
      const specs = {
        Marca: item.brand || "Não informada",
        Categoria: item.category || "Não informada",
        "Avaliação média": item.rating != null ? String(item.rating) : "—",
        Estoque: item.stock != null ? String(item.stock) : "—",
      };

      const imagemPrincipal = item.thumbnail || (item.images && item.images[0]) || null;

      const product = {
        ok: true,
        id: item.id,
        title: item.title,
        store: "Loja Demo (DummyJSON)",
        price: item.price,
        originalPrice: item.price, // pode inventar lógica depois
        image: imagemPrincipal,
        permalink: `https://dummyjson.com/products/${item.id}`,
        specs,
        description:
          item.description ||
          "Descrição não fornecida pela API. Consulte mais detalhes na página da loja.",
      };

      res.json(product);
    } catch (erro) {
      console.error("Erro ao carregar produto real:", erro);
      res.status(500).json({
        ok: false,
        error: "Erro interno ao buscar detalhes do produto.",
      });
    }
  },
};
