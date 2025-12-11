// backend/services/iaRouter.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const personasPath = path.join(__dirname, "..", "data", "ia_personas.json");
const cacheBasePath = path.join(__dirname, "..", "data", "ia_cache_base.json");

let personas = [];
let cacheBase = [];

function loadJsonSafe(filePath, label) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    console.log(`[NEXUS IA] ${label} carregado com ${data.length} item(s).`);
    return data;
  } catch (e) {
    console.error(`[NEXUS IA] Erro ao carregar ${label}:`, e.message);
    return [];
  }
}

// Carrega em memória ao subir o servidor
personas = loadJsonSafe(personasPath, "personas");
cacheBase = loadJsonSafe(cacheBasePath, "cache base");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Escolhe uma resposta aleatória da lista
function pickRandom(list = []) {
  if (!list.length) return null;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
}

// Acha persona por ID
function getPersonaById(id) {
  return personas.find((p) => p.id === id) || null;
}

// Detecta INTENT com base nos keywords
function detectIntent(messageText) {
  const msg = normalize(messageText);

  // ordem de prioridade futura pode ser ajustada
  for (const item of cacheBase) {
    const hits = (item.keywords || []).some((kw) =>
      msg.includes(normalize(kw))
    );
    if (hits) return item;
  }

  // fallback: saudação se for muito curto
  if (msg.length <= 12) {
    const greet = cacheBase.find((i) => i.intent === "greeting");
    if (greet) return greet;
  }

  // fallback geral (sem match)
  return null;
}

/**
 * Função principal:
 * - recebe texto do cliente + contexto (plano, etc. se quiser depois)
 * - escolhe intent
 * - escolhe persona
 * - escolhe template de resposta
 */
export function routeMessage(messageText, context = {}) {
  const intentItem = detectIntent(messageText);
  let persona = null;
  let template = null;

  if (intentItem) {
    persona = getPersonaById(intentItem.personaId);
    template = pickRandom(intentItem.replyTemplates || []);
  }

  // fallback se nada encontrado
  if (!persona) {
    // se o usuário tiver plano premium, podemos forçar Assistente Premium em assuntos não classificados
    const premiumLike =
      context.plan === "core" ||
      context.plan === "hyper" ||
      context.plan === "omega";

    const fallbackPersonaId = premiumLike
      ? "assistente_premium"
      : "vendedor_amigo";

    persona = getPersonaById(fallbackPersonaId) || personas[0] || null;
  }

  if (!template) {
    // se não há template pra esse intent, responde genérico
    template =
      "Eu tô aqui pra te ajudar com seus produtos, pedidos e planos Nexus. Me conta com um pouco mais de detalhe o que aconteceu ou o que você quer fazer.";
  }

  return {
    intent: intentItem ? intentItem.intent : "unknown",
    intentId: intentItem ? intentItem.id : null,
    personaId: persona ? persona.id : null,
    personaLabel: persona ? persona.label : null,
    personaRole: persona ? persona.role : null,
    reply: template
  };
}
