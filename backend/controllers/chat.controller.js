// backend/controllers/chat.controller.js

import { routeMessage } from "../ia/iaRouter.js";

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

    /* =========================
       CALL ROUTER
    ========================= */

    const result = await routeMessage(message,{
      plan,
      conversationId,
      headers: req.headers
    }) || {};

    /* =========================
       SAFE RESPONSE
    ========================= */

    const reply =
      result.reply ||
      "Me conta melhor o que você está procurando.";

    const products = result.products || [];
    const suggestions = result.suggestions || [];

    return res.status(200).json({
      ok: true,
      reply,
      products,
      suggestions
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