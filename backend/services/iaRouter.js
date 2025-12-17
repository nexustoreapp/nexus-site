// backend/services/iaRouter.js
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ===== memória simples (em RAM) =====
// Observação: em deploy com múltiplas instâncias, cada instância tem sua RAM.
// Mas já resolve MUITO o “reset” na prática.
const MEMORY = new Map();
// Limites pra não estourar tokens/custo
const MAX_TURNS = 6; // (user+assistant) pares
const MAX_USER_CHARS = 900;

// ===== catálogo =====
function loadCatalog() {
  try {
    const filePath = path.resolve("backend/data/catalogo.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw);
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

function normalize(s = "") {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

  // score simples: palavras do query presentes no item
  const words = q.split(" ").filter(Boolean);
  let hits = 0;
  for (const w of words) {
    if (w.length < 2) continue;
    if (hay.includes(w)) hits += 1;
  }

  // bônus se título contém a frase inteira (ou parte grande)
  if (hay.includes(q)) hits += 3;

  return hits;
}

function pickCatalogMatches(message, limit = 6) {
  const catalog = loadCatalog();
  const ranked = catalog
    .map((p) => ({ p, s: scoreMatch(message, p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);

  return ranked;
}

function planRank(plan = "free") {
  const p = String(plan || "free").toLowerCase();
  if (p === "omega") return 4;
  if (p === "hyper") return 3;
  if (p === "core") return 2;
  return 1; // free
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
      currency: "BRL",
    });
  } catch {
    return `R$ ${n}`;
  }
}

// ===== Prompt mãe =====
function buildSystemPrompt({ plan }) {
  return `
Você é a Nexus IA (clube de compradores de tecnologia).
Objetivo: acolher, dar segurança, vantagem e exclusividade — com elegância (sem afobação).
Regras:
- Responda rápido, direto e humano.
- Faça no máximo 2 perguntas por mensagem (só quando necessário).
- Se o cliente já deu orçamento e objetivo, NÃO “reinicie” o atendimento.
- Não invente: estoque, prazo, garantia, cupom, frete. Se faltar dado, diga que precisa verificar.
- Sempre que possível, entregue 2 a 4 opções e um “por que” curto.
- Nunca chame o produto de “Nexus ____” (o produto não é da Nexus).
- Plano do usuário: ${plan}.
- Se algo for restrito ao plano (Core/Hyper/Omega), você pode sugerir o upgrade de forma sutil.
`.trim();
}

// ===== memória =====
function getHistory(conversationId) {
  const h = MEMORY.get(conversationId);
  return Array.isArray(h) ? h : [];
}

function saveTurn(conversationId, role, content) {
  const h = getHistory(conversationId);
  h.push({ role, content });

  // mantém só os últimos MAX_TURNS*2 (user+assistant)
  const maxMsgs = MAX_TURNS * 2;
  const trimmed = h.slice(-maxMsgs);

  MEMORY.set(conversationId, trimmed);
}

export async function routeMessage(message, context = {}) {
  const plan = (context.plan || "free").toLowerCase();
  const conversationId =
    String(context.conversationId || "").trim() ||
    // fallback: se não vier id, cria um “fixo” por processo
    "default";

  const userText = String(message || "").slice(0, MAX_USER_CHARS);

  // 1) pega histórico curto
  const history = getHistory(conversationId);

  // 2) tenta puxar matches do catálogo
  const matches = pickCatalogMatches(userText, 8);

  // 3) monta “catálogo disponível” resumido pro modelo
  let catalogBlock = "";
  if (matches.length) {
    const lines = matches.map((p) => {
      const tier = String(p.accessTier || "free").toLowerCase();
      const tagTier =
        tier === "omega"
          ? "Conteúdo OMEGA"
          : tier === "hyper"
          ? "Conteúdo HYPER"
          : tier === "core"
          ? "Conteúdo CORE"
          : "Livre";

      const price = formatMoneyBRL(p.pricePublic ?? p.price ?? 0);

      return `- [${p.id}] ${p.title} — ${price} — ${tagTier}`;
    });

    catalogBlock = `
CATÁLOGO (amostra relevante):
${lines.join("\n")}

Regras de acesso:
- Se o produto não for permitido pelo plano do usuário, você pode citar que existe no catálogo e sugerir upgrade com educação.
- Se for permitido, você pode recomendar e sugerir “Comprar agora” citando o ID.
`.trim();
  }

  // 4) monta mensagens para OpenAI
  const input = [
    { role: "system", content: buildSystemPrompt({ plan }) },
    ...(catalogBlock ? [{ role: "system", content: catalogBlock }] : []),
    ...history,
    { role: "user", content: userText },
  ];

  // 5) chama OpenAI
  const model = "gpt-4o-mini";
  const max_output_tokens = plan === "free" ? 170 : 260;

  const resp = await client.responses.create({
    model,
    input,
    max_output_tokens,
    temperature: 0.7,
  });

  const reply =
    resp.output_text?.trim() ||
    "Tive um problema pra responder agora. Tenta de novo em instantes.";

  // 6) salva memória
  saveTurn(conversationId, "user", userText);
  saveTurn(conversationId, "assistant", reply);

  // 7) se tiver match, tenta anexar “sugestões” (pra UI futura)
  const suggestions = matches
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      title: p.title,
      pricePublic: p.pricePublic ?? p.price ?? null,
      accessTier: p.accessTier || "free",
      allowed: isAllowedByPlan(p, plan),
    }));

  return {
    reply,
    personaLabel: "Nexus IA",
    suggestions,
  };
}
