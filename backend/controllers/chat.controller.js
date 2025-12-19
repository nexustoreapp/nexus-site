export async function chatController(req, res) {
  try {
    const body = req.body || {};
    const userMessage =
      body.message ||
      body.text ||
      body.prompt ||
      "";

    if (!userMessage.trim()) {
      return res.json({
        reply: "Me manda sua dúvida ou produto que eu te ajudo 😉"
      });
    }

    // 🔹 PROMPT DO SISTEMA (aqui muda o jogo)
    const systemPrompt = `
Você é a Nexus IA, especialista em tecnologia, compras e comparação de produtos.
Responda sempre de forma clara, objetiva e útil.
Nunca diga apenas "recebi".
Sempre tente ajudar o usuário de verdade.
`;

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7
      })
    });

    const data = await completion.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Não consegui responder agora, tenta de novo 🙏";

    return res.json({ reply });

  } catch (err) {
    console.error("[IA ERROR]", err);
    return res.json({
      reply: "Tive um problema técnico agora, tenta novamente em instantes."
    });
  }
}
