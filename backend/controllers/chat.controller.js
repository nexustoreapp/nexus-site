// backend/controllers/chat.controller.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function clampPlan(planRaw) {
  const p = String(planRaw || "free").toLowerCase();
  if (p.includes("premium") || p.includes("paid")) return "premium";
  return "free";
}

// Prompt-mãe: “segurança + vantagem + exclusividade + acolhimento financeiro”
// e conduz compra com elegância em até 6 mensagens (sem afobação)
function buildSystemPrompt({ plan }) {
  return `
Você é a IA oficial da Nexus, um CLUBE DE COMPRADORES de tecnologia (games e escritório).
Missão: fazer o cliente sentir segurança, vantagem real e exclusividade — com acolhimento financeiro.

Regras de ouro:
- Seja rápido, claro e objetivo. Nada de textão.
- NUNCA invente: estoque, prazo, garantia, fornecedor, ou “promoção limitada” falsa.
- Se faltar dado, diga exatamente o que precisa checar/perguntar.
- Você deve analisar o contexto do cliente e se adaptar (sem sorteio de abordagem).

Conversa e venda com ELEGÂNCIA (máx. 6 mensagens suas):
1) Entenda a intenção (1 pergunta curta no máximo).
2) Se for recomendação, faça no máximo 2 perguntas (uso + orçamento OU preferência).
3) Sugira 1 melhor opção + 1 alternativa (bem direto).
4) Confirme: “posso te mandar o link/ID do produto e finalizar?” (sem pressão).
5) Se cliente topar, peça só o mínimo pra fechar (ex: cidade/forma de pagamento) e explique próximos passos.
6) Finalize com confiança e cuidado (reembolso/garantia só se isso existir no sistema; se não existir, diga que será confirmado).

Plan do usuário: ${plan}
`.trim();
}

function safeHistory(history) {
  // history esperado: [{ role: "user"|"assistant", content: "..." }, ...]
  if (!Array.isArray(history)) return [];
  return history
    .slice(-10) // no máx 10 mensagens anteriores pra custo/velocidade
    .map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content || "").slice(0, 800),
    }))
    .filter((m) => m.content.length > 0);
}

export const chatController = {
  // POST /api/chat
  handleMessage: async (req, res) => {
    try {
      const { message, plan: planRaw, history } = req.body || {};

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          ok: false,
          error: "OPENAI_API_KEY não configurada no servidor.",
        });
      }

      if (!message || typeof message !== "string") {
        return res.status(400).json({
          ok: false,
          error: "Mensagem inválida.",
        });
      }

      const plan = clampPlan(planRaw);

      // Ajuste pra velocidade/custo
      const model = "gpt-4o-mini";
      const max_output_tokens = plan === "free" ? 220 : 320;

      const input = [
        { role: "system", content: buildSystemPrompt({ plan }) },
        ...safeHistory(history),
        { role: "user", content: message.slice(0, 2000) },
      ];

      const response = await client.responses.create({
        model,
        input,
        max_output_tokens,
        temperature: 0.5, // mais “humana”, mas ainda firme/rápida
      });

      const reply =
        response.output_text?.trim() ||
        "Não consegui responder agora. Tenta de novo em instantes.";

      return res.json({
        ok: true,
        reply,
        personaLabel: "Nexus IA",
      });
    } catch (erro) {
      console.error("[NEXUS IA] Erro no chat:", erro?.message || erro);
      return res.status(500).json({
        ok: false,
        error: "Erro interno no chat da Nexus.",
      });
    }
  },
};
