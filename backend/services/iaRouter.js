// backend/services/iaRouter.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const personasPath = path.join(__dirname, "..", "data", "ia_personas.json");
const cacheBasePath = path.join(__dirname, "..", "data", "ia_cache_base.json");

// ====== Carregamento de JSON ======
let personas = [];
let cacheBase = [];

function loadJsonSafe(filePath, label) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error(`[IA] Falha ao carregar ${label}:`, e?.message || e);
    return [];
  }
}

function reloadData() {
  personas = loadJsonSafe(personasPath, "ia_personas.json");
  cacheBase = loadJsonSafe(cacheBasePath, "ia_cache_base.json");
}
reloadData();

// Recarrega a cada 30s (pra você editar JSON sem reiniciar)
setInterval(reloadData, 30_000).unref();

// ====== OpenAI (lazy init) ======
let openai = null;
function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (!openai) openai = new OpenAI({ apiKey: key });
  return openai;
}

// ====== Heurísticas rápidas (pra reduzir chamadas à OpenAI) ======
function looksLikeNeedsAI(text) {
  const t = (text || "").toLowerCase();

  // perguntas “humanas” / complexas -> IA
  if (
    t.includes("me indica") ||
    t.includes("recomenda") ||
    t.includes("qual vale mais") ||
    t.includes("custo benefício") ||
    t.includes("qual é melhor") ||
    t.includes("pra jogar") ||
    t.includes("pra trabalhar") ||
    t.includes("setup") ||
    t.includes("config") ||
    t.includes("montar pc") ||
    t.includes("compatível") ||
    t.includes("diferença entre") ||
    t.includes("orçamento") ||
    t.includes("parcel") ||
    t.includes("frete") ||
    t.includes("garantia")
  ) return true;

  // curto demais e genérico -> cache/template resolve
  if (t.length <= 18) return false;

  // se for uma pergunta direta
  if (t.includes("?")) return true;

  return false;
}

function pickPersona(context = {}) {
  // Se o teu JSON de personas tiver "default: true", prioriza.
  const def = personas.find((p) => p?.default === true);
  if (def) return def;

  // fallback: primeira persona
  return personas[0] || {
    id: "nexus_ia",
    label: "Nexus IA",
    role: "Atendimento"
  };
}

function findBestCacheTemplate(message) {
  const text = (message || "").toLowerCase();

  // cacheBase esperado: [{ id, intent, patterns:[], template }]
  // seu arquivo pode estar em outro formato — então deixo tolerante:
  let best = null;
  let bestScore = 0;

  for (const item of cacheBase) {
    const patterns = Array.isArray(item?.patterns) ? item.patterns : [];
    if (!patterns.length) continue;

    let score = 0;
    for (const p of patterns) {
      const needle = String(p || "").toLowerCase().trim();
      if (!needle) continue;
      if (text.includes(needle)) score += Math.min(3, needle.length / 6);
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (best && best?.template) {
    return {
      intent: best.intent || "cached",
      intentId: best.id || null,
      template: String(best.template)
    };
  }

  return null;
}

function buildSystemPrompt({ plan, persona }) {
  // curto = rápido
  return [
    "Você é a Nexus IA, atendimento de um clube de compradores de tecnologia.",
    "Objetivo: segurança + vantagem + exclusividade + alívio financeiro.",
    "Regras:",
    "- Responda em no máximo 6 mensagens curtas (sem textão).",
    "- Seja direto e humano (nada robótico).",
    "- Faça no máximo 2 perguntas por vez.",
    "- Se o cliente estiver pronto pra comprar, guie com elegância (sem pressa).",
    "- Nunca invente estoque/garantia/prazo. Se não souber, diga que precisa verificar.",
    `Plano do cliente: ${plan || "free"}.`,
    `Persona: ${persona?.label || "Nexus IA"} (${persona?.role || "Atendimento"}).`
  ].join("\n");
}

// ====== Função principal (AGORA É ASYNC) ======
export async function routeMessage(message, context = {}) {
  const plan = (context?.plan || "free").toLowerCase();
  const persona = pickPersona(context);

  // 1) tenta cache/template (instantâneo)
  const cached = findBestCacheTemplate(message);
  const shouldUseAI = looksLikeNeedsAI(message);

  if (cached && !shouldUseAI) {
    return {
      intent: cached.intent,
      intentId: cached.intentId,
      personaId: persona.id,
      personaLabel: persona.label,
      personaRole: persona.role,
      reply: cached.template
    };
  }

  // 2) tenta OpenAI (rápido, curto, com timeout)
  const client = getOpenAIClient();
  if (!client) {
    // sem chave: volta pro cache ou fallback
    return {
      intent: cached?.intent || "fallback",
      intentId: cached?.intentId || null,
      personaId: persona.id,
      personaLabel: persona.label,
      personaRole: persona.role,
      reply:
        cached?.template ||
        "Consigo te ajudar sim. Me diz 2 coisas rapidinho: (1) o que você quer comprar e (2) seu orçamento aproximado."
    };
  }

  const model = "gpt-4o-mini";
  const max_output_tokens = plan === "free" ? 180 : 260;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const resp = await client.responses.create(
      {
        model,
        max_output_tokens,
        temperature: 0.4,
        input: [
          { role: "system", content: buildSystemPrompt({ plan, persona }) },
          { role: "user", content: String(message).slice(0, 1500) }
        ]
      },
      { signal: controller.signal }
    );

    const reply =
      resp.output_text?.trim() ||
      cached?.template ||
      "Me diz o que você quer comprar e o seu orçamento que eu te passo as melhores opções.";

    return {
      intent: "openai",
      intentId: null,
      personaId: persona.id,
      personaLabel: persona.label,
      personaRole: persona.role,
      reply
    };
  } catch (e) {
    const msg = String(e?.message || e);
    console.error("[IA] OpenAI error:", msg);

    return {
      intent: cached?.intent || "fallback",
      intentId: cached?.intentId || null,
      personaId: persona.id,
      personaLabel: persona.label,
      personaRole: persona.role,
      reply:
        cached?.template ||
        "Tive uma instabilidade rapidinha. Me manda de novo o que você quer comprar + seu orçamento que eu já resolvo."
    };
  } finally {
    clearTimeout(timeout);
  }
}
