// backend/controllers/chat.controller.js
import { routeMessage } from "../services/iaRouter.js";

export const chatController = {
  // POST /api/chat
  handleMessage: async (req, res) => {
    try {
      const { message, plan, conversationId } = req.body || {};

      if (!message || typeof message !== "string") {
        return res.status(400).json({
          ok: false,
          error: "Mensagem inválida.",
        });
      }

      const context = {
        plan: (plan || "free").toLowerCase(),
        conversationId: String(conversationId || "").trim(),
      };

      const result = await routeMessage(message, context);

      return res.json({
        ok: true,
        ...result,
      });
    } catch (erro) {
      console.error("[NEXUS IA] Erro no chat:", erro);
      return res.status(500).json({
        ok: false,
        error: "Erro interno no chat da Nexus.",
      });
    }
  },
};
