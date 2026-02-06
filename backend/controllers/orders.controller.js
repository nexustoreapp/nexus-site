import { escolherFornecedor } from "../services/fornecedorDecision.service.js";

export async function createOrder(req, res) {
  try {
    const user = req.user;
    const { productId, categoria } = req.body;

    if (!productId || !categoria) {
      return res.status(400).json({ ok: false, error: "INVALID_DATA" });
    }

    const fornecedor = escolherFornecedor({ categoria });

    if (!fornecedor) {
      return res.status(503).json({
        ok: false,
        error: "NO_SUPPLIER_AVAILABLE"
      });
    }

    const order = {
      id: `ord_${Date.now()}`,
      userId: user.id,
      productId,
      categoria,
      fornecedor: {
        id: fornecedor.id,
        nome: fornecedor.nome,
        slaDias: fornecedor.slaDias
      },
      status: "CRIADO",
      createdAt: Date.now()
    };

    // aqui você já salva no store atual que você usa
    // ex: upsertOrder(order)

    return res.json({ ok: true, order });

  } catch (err) {
    console.error("[ORDER CREATE]", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}