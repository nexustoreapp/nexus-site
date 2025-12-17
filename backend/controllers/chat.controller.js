// backend/controllers/chat.controller.js
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ====== Ajustes de velocidade ======
const MODEL = "gpt-4o-mini";
const MAX_OUTPUT_TOKENS = 140; // mais rápido
const TEMPERATURE = 0.25;

// ====== Heurística: só puxar catálogo quando parecer intenção de compra ======
function shouldUseCatalog(message = "") {
  const m = message.toLowerCase().trim();
  if (!m) return false;

  // evita puxar catálogo em "oi", "blz", etc
  const greetings = ["oi", "olá", "ola", "eai", "ei", "bom dia", "boa tarde", "boa noite"];
  if (greetings.includes(m)) return false;

  const keywords = [
    "pc", "computador", "setup", "rtx", "ryzen", "intel", "i5", "i7", "i9",
    "placa de vídeo", "gpu", "cpu", "processador", "ssd", "ram", "memória",
    "monitor", "144hz", "165hz", "240hz", "qhd", "2k", "4k",
    "mouse", "teclado", "headset", "cadeira", "gabinete", "fonte", "water cooler",
    "comprar", "preço", "barato", "promo", "desconto", "orçamento", "r$"
  ];

  return keywords.some((k) => m.includes(k));
}

function clampHistory(history) {
  // Aceita history como array de { role: "user"|"assistant", content: "..." }
  if (!Array.isArray(history)) return [];
  const cleaned = history
    .filter((x) => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string")
    .map((x) => ({ role: x.role, content: x.content.slice(0, 1200) })); // corta por segurança
  // mantém só as últimas 8 mensagens
  return cleaned.slice(-8);
}

function buildSystemPrompt({ plan = "free", catalogPreview = "" } = {}) {
  return `
Você é a "Nexus IA" (clube de compradores de tecnologia).
Missão: acolher com elegância e guiar até a compra sem ser afobada.

REGRAS:
- Responda como humano, direto, com calma e confiança.
- NÃO reinicie a conversa: use o histórico recebido.
- Faça NO MÁXIMO 2 perguntas por resposta.
- Quando tiver orçamento, já sugira 1–3 caminhos (ex: custo/benefício, desempenho, “top”).
- Se houver catálogo abaixo, use-o. Não invente produto/preço/estoque.
- Se faltar algo essencial, pergunte só o essencial.

Plano do cliente: ${String(plan).toUpperCase()}.
CATÁLOGO (se houver):
${catalogPreview || "(sem itens carregados agora)"}
`.trim();
}

function formatCatalogPreview(results = [], maxItems = 4) {
  const items = (results || []).slice(0, maxItems);
  if (!items.length) return "";
  return items
    .map((p, i) => {
      const pub = typeof p.pricePublic === "number" ? `R$ ${p.pricePublic.toFixed(2)}` : "—";
      const prem = typeof p.pricePremium === "number" ? `R$ ${p.pricePremium.toFixed(2)}` : "—";
      return `${i + 1}) ${p.title} (id=${p.id}) público=${pub} premium=${prem}`;
    })
    .join("\n");
}

async function fetchCatalogInternal(req, query) {
  try {
    const host = req.get("host");
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const url = `${proto}://${host}/api/search?query=${encodeURIComponent(query)}`;

    const r = await fetch(url, { method: "GET" });
    const data = await r.json();

    if (data?.ok && Array.isArray(data.results)) return data.results;
    return [];
  } catch (e) {
    console.error("[NEXUS IA] Falha ao puxar catálogo:", e?.message || e);
    return [];
  }
}

function buildLinks(results = []) {
  return (results || [])
    .slice(0, 3)
    .map(
      (p) =>
        `• <a href="produto.html?id=${encodeURIComponent(
          p.id
        )}" target="_blank" rel="noopener">Ver ${p.title}</a>`
    )
    .join("<br/>");
}

export const chatController = {
  handleMessage: async (req, res) => {
    try {
      const { message, plan, history } = req.body || {};

      if (!message || typeof message !== "string") {
        return res.status(400).json({ ok: false, error: "Mensagem inválida." });
      }

      const safePlan = (plan || "free").toString().toLowerCase();
      const safeHistory = clampHistory(history);

      let catalogResults = [];
      if (shouldUseCatalog(message)) {
        catalogResults = await fetchCatalogInternal(req, message);
      }

      const catalogPreview = formatCatalogPreview(catalogResults, 4);

      const input = [
        { role: "system", content: buildSystemPrompt({ plan: safePlan, catalogPreview }) },
        ...safeHistory,
        { role: "user", content: message.slice(0, 2000) },
      ];

      const response = await openai.responses.create({
        model: MODEL,
        temperature: TEMPERATURE,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        input,
      });

      const replyText =
        response.output_text?.trim() ||
        "Não consegui responder agora. Tenta de novo em instantes.";

      const links = catalogResults.length
        ? `<br/><br/><strong>Opções do catálogo:</strong><br/>${buildLinks(catalogResults)}`
        : "";

      return res.json({
        ok: true,
        reply: replyText + links,
        personaLabel: "Nexus IA",
        catalogTotal: catalogResults.length,
      });
    } catch (erro) {
      console.error("[NEXUS IA] Erro no chat:", erro?.message || erro);
      return res.status(500).json({ ok: false, error: "Erro interno no chat da Nexus." });
    }
  },
};
