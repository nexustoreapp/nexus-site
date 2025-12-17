// backend/controllers/chat.controller.js
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Heurística simples: só tenta puxar catálogo quando parece pedido de produto
function shouldUseCatalog(message = "") {
  const m = message.toLowerCase();
  const keywords = [
    "monitor",
    "mouse",
    "teclado",
    "notebook",
    "headset",
    "cadeira",
    "mousepad",
    "kit",
    "rtx",
    "fps",
    "144hz",
    "165hz",
    "2k",
    "qhd",
    "rgb",
    "gamer",
    "setup",
    "comprar",
    "preço",
    "barato",
    "promo",
    "desconto",
    "orçamento",
    "r$",
  ];
  const looksLikeGreetingOnly =
    m.trim().length <= 3 || ["oi", "ola", "olá", "eai", "ei"].includes(m.trim());
  if (looksLikeGreetingOnly) return false;
  return keywords.some((k) => m.includes(k));
}

function buildSystemPrompt({ plan = "free", catalogPreview = "" } = {}) {
  return `
Você é a "Nexus IA" — atendimento do Clube Nexus (tecnologia mais barata com segurança).
Objetivo: o cliente sentir segurança, vantagem, exclusividade e alívio financeiro.

REGRAS DE RESPOSTA (OBRIGATÓRIO):
- Seja RÁPIDO, direto, humano, elegante (nada robótico).
- Em UMA resposta, resolva o máximo possível.
- Faça NO MÁXIMO 2 perguntas quando faltar algo importante.
- Quando sugerir produtos, mostre 1 a 3 opções e diga "por que vale".
- Use o CATALOGO REAL abaixo quando houver itens. NÃO invente produto, estoque ou preço.
- Se não achar no catálogo, diga que não encontrou e pergunte o que o cliente aceita como alternativa.
- Se o cliente estiver pronto pra comprar: guie com calma, sem afobação (ex: "Quer que eu te indique o melhor custo-benefício e já te mande o link do produto?").

Plano atual: ${plan.toUpperCase()}.

CATÁLOGO REAL (prévia):
${catalogPreview || "(sem itens carregados agora)"}
`.trim();
}

function formatCatalogPreview(results = [], maxItems = 5) {
  const items = (results || []).slice(0, maxItems);
  if (!items.length) return "";
  return items
    .map((p, i) => {
      const pub = typeof p.pricePublic === "number" ? `R$ ${p.pricePublic.toFixed(2)}` : "—";
      const prem = typeof p.pricePremium === "number" ? `R$ ${p.pricePremium.toFixed(2)}` : "—";
      const flags = [
        p.premiumOnly ? "premiumOnly" : null,
        p.omegaExclusive ? "omegaExclusive" : null,
        typeof p.stock === "number" ? `stock:${p.stock}` : null,
        p.category ? `cat:${p.category}` : null,
      ]
        .filter(Boolean)
        .join(", ");

      return `${i + 1}) ${p.title} | id=${p.id} | público=${pub} | premium=${prem}${flags ? ` | ${flags}` : ""}`;
    })
    .join("\n");
}

async function fetchCatalogFromThisAPI(req, query) {
  try {
    const host = req.get("host");
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const url = `${proto}://${host}/api/search?query=${encodeURIComponent(query)}`;

    const r = await fetch(url, { method: "GET" });
    const data = await r.json();

    if (data?.ok && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  } catch (e) {
    console.error("[NEXUS IA] Falha ao puxar catálogo interno:", e?.message || e);
    return [];
  }
}

function buildLinks(results = []) {
  // links pro teu front (produto.html?id=...)
  return (results || [])
    .slice(0, 3)
    .map((p) => `• <a href="produto.html?id=${encodeURIComponent(p.id)}" target="_blank" rel="noopener">Ver ${p.title}</a>`)
    .join("<br/>");
}

export const chatController = {
  // POST /api/chat
  handleMessage: async (req, res) => {
    try {
      const { message, plan } = req.body || {};

      if (!message || typeof message !== "string") {
        return res.status(400).json({ ok: false, error: "Mensagem inválida." });
      }

      const safePlan = (plan || "free").toString().toLowerCase();

      // Puxa catálogo REAL (somente quando fizer sentido)
      let catalogResults = [];
      if (shouldUseCatalog(message)) {
        catalogResults = await fetchCatalogFromThisAPI(req, message);
      }

      const catalogPreview = formatCatalogPreview(catalogResults, 5);

      // Mais rápido = menos tokens + resposta objetiva
      const model = "gpt-4o-mini";
      const max_output_tokens = 180; // rápido
      const temperature = 0.35;

      const response = await openai.responses.create({
        model,
        temperature,
        max_output_tokens,
        input: [
          { role: "system", content: buildSystemPrompt({ plan: safePlan, catalogPreview }) },
          { role: "user", content: message.slice(0, 2000) },
        ],
      });

      const replyText =
        response.output_text?.trim() ||
        "Não consegui responder agora. Tenta de novo em instantes.";

      // Se achou produtos, já manda link direto (sem enrolar)
      const links = catalogResults.length ? `<br/><br/><strong>Links rápidos:</strong><br/>${buildLinks(catalogResults)}` : "";
      const finalReply = `${replyText}${links}`;

      return res.json({
        ok: true,
        reply: finalReply,
        personaLabel: "Nexus IA",
        catalogTotal: catalogResults.length,
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
