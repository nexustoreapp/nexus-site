import { selecionarFornecedor } from "../services/fornecedor.service.js";

export async function criarPedido(req, res) {
  try {
    const { produto } = req.body;

    if (!produto) {
      return res.status(400).json({ ok: false, error: "PRODUTO_INVALIDO" });
    }

    const fornecedor = selecionarFornecedor(produto);

    const pedido = {
      id: crypto.randomUUID(),
      produto,
      fornecedor: {
        id: fornecedor.id,
        nome: fornecedor.nome,
        slaDias: fornecedor.slaDias
      },
      status: "CRIADO",
      criadoEm: new Date().toISOString()
    };

    return res.json({
      ok: true,
      pedido
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}