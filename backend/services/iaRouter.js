import fs from "fs";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let CATALOG_CACHE = null;

function loadCatalog() {
  if (CATALOG_CACHE) return CATALOG_CACHE;

  try {
    const filePath = path.resolve("backend/data/catalogo.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw);
    CATALOG_CACHE = Array.isArray(json) ? json : [];
    return CATALOG_CACHE;
  } catch {
    return [];
  }
}

const SLANG_MAP = {
  oi: ["eae", "salve", "opa", "yo", "sup", "fala", "fala ai", "fala aí"],
  obrigado: ["valeu", "tmj", "brigado"],
  problema: ["bug", "deu ruim", "zoado", "travou"],
  comprar: ["pegar", "adquirir"]
};

function normalizeSlang(text) {
  let t = String(text || "").toLowerCase();

  for (const key in SLANG_MAP) {
    for (const slang of SLANG_MAP[key]) {
      const escaped = slang.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rg = new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "g");
      t = t.replace(rg, (m, prefix) => `${prefix}${key}`);
    }
  }

  return t;
}

const FAST_INTENTS = [
  {
    keywords: ["oi", "ola", "olá", "bom dia", "boa tarde", "boa noite"],
    reply: [
      "E aí! 👋 Eu sou a Nayla da Nexus. Como posso ajudar você hoje?",
      "Oi! Seja bem-vindo(a) à Nexus Store. Quer ajuda com produto ou planos?"
    ]
  },
  {
    keywords: ["obrigado", "obrigada"],
    reply: [
      "Imagina! 😊 Qualquer coisa é só chamar.",
      "Tamo junto! Se precisar de algo mais é só falar."
    ]
  },
  {
    keywords: ["planos", "assinatura", "nexus+"],
    reply: [
      "A Nexus tem planos Core, Hyper e Omega. Cada um libera mais vantagens e descontos. Quer que eu te explique qual vale mais a pena pra você?"
    ]
  }
];

const MEMORY = new Map();
const MAX_TURNS = 4;
const MAX_USER_CHARS = 800;

function normalize(s = "") {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function planRank(plan = "free") {
  const p = String(plan).toLowerCase();
  if (p === "omega") return 4;
  if (p === "hyper") return 3;
  if (p === "core") return 2;
  return 1;
}

function isAllowedByPlan(product, plan = "free") {
  const userRank = planRank(plan);
  const tier = String(product.accessTier || "free").toLowerCase();
  const required = planRank(tier);
  return userRank >= required;
}

function formatMoneyBRL(n) {
  try {
    return Number(n).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  } catch {
    return `R$ ${n}`;
  }
}

function scoreMatch(query, item) {
  const q = normalize(query);
  if (!q) return 0;

  const hay =
    normalize(item.title || "") +
    " " +
    normalize(item.subtitle || "") +
    " " +
    normalize((item.tags || []).join(" "));

  const words = q.split(" ").filter(Boolean);
  let hits = 0;

  for (const w of words) {
    if (w.length < 2) continue;
    if (hay.includes(w)) hits++;
  }

  if (hay.includes(q)) hits += 3;

  return hits;
}

function pickCatalogMatches(message, limit = 4) {
  const catalog = loadCatalog();

  return catalog
    .map((p) => ({ p, s: scoreMatch(message, p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
}

function buildSystemPrompt({ plan }) {
  return `
Você é Nayla, assistente da Nexus Store.

Função:
Ajudar clientes a encontrar produtos e responder dúvidas sobre tecnologia.

Regras:
- Responda de forma clara, direta e humana.
- Evite respostas longas.
- Se o usuário pediu recomendação, ofereça até 3 opções.
- Não invente estoque, frete ou prazo.
- Se faltar informação, diga que precisa verificar.

Plano do usuário: ${plan}

Se algum produto for restrito ao plano, sugira upgrade de forma educada.
`.trim();
}

function getHistory(conversationId) {
  const h = MEMORY.get(conversationId);
  return Array.isArray(h) ? h : [];
}

function saveTurn(conversationId, role, content) {
  const h = getHistory(conversationId);
  h.push({ role, content });

  const maxMsgs = MAX_TURNS * 2;
  MEMORY.set(conversationId, h.slice(-maxMsgs));
}

function hasWholeKeyword(text, keyword) {
  const normalizedText = ` ${normalize(text)} `;
  const normalizedKeyword = normalize(keyword);
  const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rg = new RegExp(`\\s${escaped}\\s`, "i");
  return rg.test(normalizedText);
}

function checkFastIntent(message) {
  for (const intent of FAST_INTENTS) {
    for (const kw of intent.keywords) {
      if (hasWholeKeyword(message, kw)) {
        return intent.reply[Math.floor(Math.random() * intent.reply.length)];
      }
    }
  }
  return null;
}

function getClarificationReply(text) {
  const t = normalize(text);

  if (["placa", "gpu", "placa de video", "placa de vídeo"].some((k) => hasWholeKeyword(t, k))) {
    return "Beleza. Você quer placa de vídeo para jogar, trabalhar ou uso básico? E qual faixa de preço você quer mais ou menos?";
  }

  if (["processador", "cpu"].some((k) => hasWholeKeyword(t, k))) {
    return "Certo. Você quer processador para jogo, trabalho ou uso mais básico? Se quiser, já te ajudo por faixa de preço também.";
  }

  if (["notebook", "monitor", "headset", "mouse", "teclado"].some((k) => hasWholeKeyword(t, k))) {
    return "Consigo te ajudar sim. Me fala só qual produto você quer e o que é mais importante pra você: preço, desempenho, durabilidade ou custo-benefício.";
  }

  return null;
}

export async function routeMessage(message, context = {}) {
  const plan = (context.plan || "free").toLowerCase();
  const conversationId = context.conversationId || "guest";

  const userText = normalizeSlang(String(message || "").slice(0, MAX_USER_CHARS));

  const fast = checkFastIntent(userText);
  if (fast) {
    return {
      reply: fast,
      personaLabel: "Nayla",
      suggestions: []
    };
  }

  const clarification = getClarificationReply(userText);
  if (clarification) {
    return {
      reply: clarification,
      personaLabel: "Nayla",
      suggestions: []
    };
  }

  const history = getHistory(conversationId);
  const matches = pickCatalogMatches(userText, 4);

  let catalogBlock = "";

  if (matches.length) {
    const lines = matches.map((p) => {
      const tier = String(p.accessTier || "free").toLowerCase();

      const tagTier =
        tier === "omega"
          ? "OMEGA"
          : tier === "hyper"
          ? "HYPER"
          : tier === "core"
          ? "CORE"
          : "Livre";

      const price = formatMoneyBRL(p.pricePublic ?? p.price ?? 0);

      return `- [${p.id}] ${p.title} — ${price} — ${tagTier}`;
    });

    catalogBlock = `
CATÁLOGO RELEVANTE:

${lines.join("\n")}
`;
  }

  try {
    const input = [
      { role: "system", content: buildSystemPrompt({ plan }) },
      ...(catalogBlock ? [{ role: "system", content: catalogBlock }] : []),
      ...history,
      { role: "user", content: userText }
    ];

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      input,
      temperature: 0.5,
      max_output_tokens: plan === "free" ? 160 : 240
    });

    const reply =
      resp.output_text?.trim() ||
      "Tive um problema para responder agora.";

    saveTurn(conversationId, "user", userText);
    saveTurn(conversationId, "assistant", reply);

    const suggestions = matches.slice(0, 4).map((p) => ({
      id: p.id,
      title: p.title,
      pricePublic: p.pricePublic ?? p.price ?? null,
      accessTier: p.accessTier || "free",
      allowed: isAllowedByPlan(p, plan)
    }));

    return {
      reply,
      personaLabel: "Nayla",
      suggestions
    };
  } catch {
    return {
      reply: "Eu consigo te ajudar melhor se você me disser o produto que quer e sua faixa de preço. Por exemplo: placa de vídeo até 2 mil, notebook para estudo, monitor para FPS.",
      personaLabel: "Nayla",
      suggestions: []
    };
  }
}