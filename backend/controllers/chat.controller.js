// backend/controllers/chat.controller.js

export async function chat(req, res) {
  try {
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({ ok: false, error: "Mensagem vazia." });
    }

    // Por enquanto é um "stub" (resposta simples) só pra API não quebrar.
    // Depois a gente liga na IA de verdade.
    const reply =
      "IA Nexus (beta): recebi sua mensagem ✅\n\n" +
      "Mensagem: " +
      message;

    return res.status(200).json({ ok: true, reply });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Erro no chat." });
  }
}