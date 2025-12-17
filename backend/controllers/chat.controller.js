function shuffleWithSeed(array, seed) {
  let currentIndex = array.length;
  let random;

  function seededRandom() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  while (currentIndex !== 0) {
    random = Math.floor(seededRandom() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[random]] = [
      array[random],
      array[currentIndex],
    ];
  }

  return array;
}

function getDailySeed() {
  const d = new Date();
  return Number(`${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}`);
}

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
