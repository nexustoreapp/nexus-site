// backend/services/iaRouter.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

// --------------------
// Carrega catálogo REAL (backend/data/catalogo.json)
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATALOG_PATH = path.join(__dirname, "../data/catalogo.json");

function loadCatalog() {
  try {
    const raw = fs.readFileSync(CATALOG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    // Espera array de produtos
    return Array.isArray(parsed) ? parsed : (parsed?.products || parsed?.results || []);
  } catch (e) {
    console.error("[CATALOGO] Falha ao ler catalogo.json:", e?.message || e);
    return [];
  }
}

const CATALOG = loadCatalog();

// --------------------
// Busca simples (rápida) no catálogo
// --------------------
function normalize(str = "") {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function scoreProduct(prod, q) {
  const hay = normalize(
    [
      prod.id,
      prod.title,
      prod.subtitle,
      prod.category,
      ...(prod.tags || []),
    ].join(" ")
  );
  const terms = normalize(q).split(/\s+/).filter(Boolean);

  let score = 0;
  for (const t of terms) {
    if (hay.includes(t)) score += 2;
  }
  // bônus se bater categoria
  if (normalize(prod.category || "").includes(terms[0] || "")) score += 1;

  // bônus se tiver estoque
  if ((prod.stock ?? 0) > 0) score += 0.5;

  return score;
}

function findCatalogMatches(query, limit = 6) {
  const q = normalize(query);
  if (!q || q.length < 2) return [];

  const ranked = CATALOG.map((p) => ({ p, s: scoreProduct(p, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);

  return ranked;
}

function formatBRL(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// --------------------
// Persona/estilo Nexus
// --------------------
function buildSystemPrompt({ plan, userMessage, matchedProducts }) {
  const planSafe = plan || "free";

  const catalogContext = matchedProducts?.length
    ? matchedProducts
        .map((p) => {
          return `- id: ${p.id}
  title: ${p.title}
  subtitle: ${p.subtitle || ""}
  category: ${p.category || ""}
  tags: ${(p.tags || []).join(", ")}
  pricePublic: ${p.pricePublic}
  pricePremium: ${p.pricePremium}
  stock: ${p.stock}
  premiumOnly: ${p.premiumOnly}
  omegaExclusive: ${p.omegaExclusive}`;
        })
        .join("\n")
    : "Nenhum produto relevante encontrado no catálogo para a mensagem atual.";

  return `
Você é a IA da Nexus (clube de compradores de tecnologia).
Objetivo: fazer o cliente sentir segurança, vantagem, exclusividade e alívio financeiro.

REGRAS DE OURO:
- Responder rápido, direto e com elegância (sem parecer vendedora afobada).
- No máximo 6 mensagens para levar do interesse ao “comprar agora”.
- Faça no máximo 2-3 perguntas por vez (uso, orçamento, preferência).
- NUNCA invente estoque, prazo, garantia, cupom. Se não tiver dado, diga que precisa confirmar.
- Recomendações precisam ser baseadas no CATÁLOGO REAL fornecido abaixo.
- Se o cliente estiver pronto pra comprar, guie para: "produto.html?id=ID_DO_PRODUTO" e ofereça 1 passo seguinte claro.

PLANO DO USUÁRIO: ${planSafe}

CATÁLOGO (matches para esta conversa):
${catalogContext}

MENSAGEM DO CLIENTE:
${userMessage}
`.trim();
}

// --------------------
// OpenAI client (só se tiver chave no Render)
// --------------------
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const openai = hasOpenAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// --------------------
// Roteador principal
// --------------------
export async function routeMessage(message, context = {}) {
  const plan = context.plan || "free";
  const text = String(message || "").trim();

  // 1) Sempre tenta achar produto no catálogo primeiro (real, rápido)
  const matches = findCatalogMatches(text, 6);

  // 2) Se não tiver OpenAI, responde “real” com base no catálogo mesmo
  if (!openai) {
    if (!matches.length) {
      return {
        personaLabel: "Nexus IA",
        reply:
          "Me diz o que você quer comprar (ex: “monitor 144hz”, “mouse leve”, “teclado mecânico”) e, se puder, seu orçamento. Aí eu já te indico as melhores opções do catálogo Nexus.",
        suggestedPlan: plan,
        products: [],
      };
    }

    const top = matches.slice(0, 3);
    const lines = top
      .map((p, idx) => {
        const price = plan === "free" ? formatBRL(p.pricePublic) : formatBRL(p.pricePremium);
        return `${idx + 1}) ${p.title} — ${price} — abrir: produto.html?id=${p.id}`;
      })
      .join("\n");

    return {
      personaLabel: "Nexus IA",
      reply:
        `Achei opções no catálogo Nexus:\n\n${lines}\n\n` +
        `Pra eu cravar a melhor: você vai usar pra quê (FPS/Trabalho/Estudo) e qual faixa de orçamento?`,
      suggestedPlan: plan,
      products: top,
    };
  }

  // 3) Com OpenAI: passa os produtos encontrados como contexto e pede recomendação elegante
  const system = buildSystemPrompt({
    plan,
    userMessage: text,
    matchedProducts: matches,
  });

  try {
    const model = "gpt-4o-mini";
    const max_output_tokens = plan === "free" ? 260 : 420;

    const response = await openai.responses.create({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: text.slice(0, 2000) },
      ],
      max_output_tokens,
    });

    const reply =
      response.output_text?.trim() ||
      "Tive um problema pra responder agora. Tenta de novo em instantes.";

    // resposta já vem “bonita”, mas também devolvo os top produtos (pra você usar no front depois, se quiser)
    return {
      personaLabel: "Nexus IA",
      reply,
      suggestedPlan: plan,
      products: matches.slice(0, 3),
    };
  } catch (err) {
    console.error("[OPENAI] Erro:", err?.message || err);

    // fallback real (catálogo) se a OpenAI falhar
    if (!matches.length) {
      return {
        personaLabel: "Nexus IA",
        reply:
          "Tive um erro com a IA agora. Me diz o que você quer comprar (ex: “monitor 144hz”) e seu orçamento, que eu te indico do catálogo Nexus.",
        suggestedPlan: plan,
        products: [],
      };
    }

    const top = matches.slice(0, 3);
    const lines = top
      .map((p, idx) => {
        const price = plan === "free" ? formatBRL(p.pricePublic) : formatBRL(p.pricePremium);
        return `${idx + 1}) ${p.title} — ${price} — abrir: produto.html?id=${p.id}`;
      })
      .join("\n");

    return {
      personaLabel: "Nexus IA",
      reply:
        `Tive um erro com a IA, mas achei opções no catálogo Nexus:\n\n${lines}\n\n` +
        `Você vai usar pra quê e qual seu orçamento?`,
      suggestedPlan: plan,
      products: top,
    };
  }
}
