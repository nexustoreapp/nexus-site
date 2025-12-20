export async function chatController(req, res) {
  try {
    const body = req.body || {};

    const userMessage =
      body.message ||
      body.text ||
      body.prompt ||
      "";

    if (!String(userMessage).trim()) {
      return res.json({
        reply: "Me manda sua dúvida ou o produto que eu te ajudo 🙂"
      });
    }

    const systemPrompt = `
Você é a Nexus IA, especialista em tecnologia, compras e comparação de produtos.
Responda sempre de forma clara, objetiva e útil.
Nunca diga apenas "recebi".
Sempre tente ajudar o usuário de verdade.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.6
      })
    });

    const data = await response.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Não consegui responder agora. Tenta novamente.";

    return res.json({ reply });
  } catch (err) {
    console.error("[CHAT] erro:", err);
    return res.status(500).json({
      reply: "O chat está instável no momento. Tenta novamente em instantes."
    });
  }
}
