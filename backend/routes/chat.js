import express from "express";
import OpenAI from "openai";

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Prompt “mãe” do Nexus (você pode evoluir depois)
function buildSystemPrompt(plan = "free") {
  return `
Você é a IA da Nexus (clube de compradores de tecnologia).
Objetivo: ajudar o cliente a escolher e comprar com segurança, vantagem e exclusividade.
Regras:
- Seja direto, claro e rápido.
- Quando recomendar produto, pergunte 2-3 coisas no máximo (uso, orçamento, preferência).
- Nunca invente estoque, prazo ou garantia. Se faltar dado, diga que precisa verificar.
- Use tom acolhedor e “alívio financeiro”.
Plano do usuário: ${plan}.
`.trim();
}

router.post("/chat", async (req, res) => {
  try {
    const { message, plan = "free" } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ ok: false, error: "Mensagem inválida." });
    }

    // Controle de custo/latência (ajuste depois)
    const model = "gpt-4o-mini";
    const max_output_tokens = plan === "free" ? 220 : 350;

    const response = await client.responses.create({
      model,
      input: [
        { role: "system", content: buildSystemPrompt(plan) },
        { role: "user", content: message.slice(0, 2000) },
      ],
      max_output_tokens,
    });

    const reply =
      response.output_text?.trim() ||
      "Não consegui responder agora. Tenta de novo em instantes.";

    return res.json({
      ok: true,
      reply,
      personaLabel: "Nexus IA",
    });
  } catch (err) {
    console.error("CHAT ERROR:", err?.message || err);
    return res.status(500).json({
      ok: false,
      error: "Falha ao falar com a IA.",
    });
  }
});

export default router;
