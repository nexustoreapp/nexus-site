// backend/controllers/chat.controller.js
import OpenAI from "openai";
import { routeMessage } from "../services/iaRouter.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Prompt-base do Nexus (central, evolutivo)
function buildSystemPrompt({ plan }) {
  return `
Você é a IA oficial da Nexus.
A Nexus é um clube de compradores de tecnologia (games e escritório).
Promessa central: sempre mais barato que grandes marketplaces.

Regras:
- Seja rápida, clara e objetiva
- Gere confiança e alívio financeiro
- Faça no máximo 2 perguntas por vez
- Nunca invente estoque, prazos ou garantias
- Se faltar dado, diga que vai verificar

Plano do usuário: ${plan}
`.trim();
}

export const chatController = {
  // POST /api/chat
  handleMessage: async (req, res) => {
    try {
      const { message, plan = "free" } = req.body || {};

      if (!message || typeof message !== "string") {
        return res.status(400).json({
          ok: false,
          error: "Mensagem inválida."
        });
      }

      // 🔁 Primeiro: passa pelo seu roteador interno (personas / lógica)
      const internalContext = {
        plan
      };

      const routed = await routeMessage(message, internalContext);

      // Se o roteador interno já resolveu (ex: FAQ, fluxo fixo)
      if (routed?.handledInternally) {
        return res.json({
          ok: true,
          reply: routed.reply,
          personaLabel: routed.personaLabel || "Nexus IA"
        });
      }

      // 🤖 OpenAI (resposta real)
      const completion = await openai.responses.create({
        model: "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: buildSystemPrompt({ plan })
          },
          {
            role: "user",
            content: message.slice(0, 2000)
          }
        ],
        max_output_tokens: plan === "free" ? 220 : 380
      });

      const reply =
        completion.output_text?.trim() ||
        "Tive um problema para responder agora. Pode tentar novamente?";

      return res.json({
        ok: true,
        reply,
        personaLabel: "Nexus IA"
      });
    } catch (erro) {
      console.error("[NEXUS IA] Erro no chat:", erro);
      return res.status(500).json({
        ok: false,
        error: "Erro interno no chat da Nexus."
      });
    }
  }
};
