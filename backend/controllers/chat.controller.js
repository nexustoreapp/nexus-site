// backend/controllers/chat.controller.js

import { routeMessage } from "../services/iaRouter.js";

export async function chat(req, res) {

  try {

    const message = String(req.body?.message || "").trim();

    if (!message) {

      return res.status(400).json({
        ok: false,
        error: "Mensagem vazia."
      });

    }

    const plan = req.user?.plan || "free";

    const conversationId =
      req.user?.email ||
      req.headers["x-conversation-id"] ||
      "guest";

    const result = await routeMessage(message, {
      plan,
      conversationId
    });

    return res.status(200).json({
      ok: true,
      reply: result.reply,
      products: result.products || [],
      suggestions: result.suggestions || []
    });

  }
  catch (err) {

    console.error("Chat error:", err);

    return res.status(500).json({
      ok: false,
      error: "Erro no chat."
    });

  }

}