export const chatController = {
  async handleMessage(req, res) {
    try {
      const { message } = req.body || {};

      if (!message) {
        return res.status(400).json({
          ok: false,
          error: "Mensagem não enviada",
        });
      }

      // placeholder seguro (IA continua funcionando depois)
      return res.json({
        ok: true,
        reply: "Recebi sua mensagem 👍",
      });
    } catch (err) {
      console.error("[CHAT] ERRO:", err);
      return res.status(500).json({
        ok: false,
        error: "Erro interno no chat",
      });
    }
  },
};
