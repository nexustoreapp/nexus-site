import OpenAI from "openai";
import fs from "fs";
import path from "path";

import { detectIntent } from "../ia/intentMatcher.js";
import { selectPersona } from "../ia/personaSelector.js";
import { normalizeSlang } from "../ia/slangNormalizer.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ===============================
CACHE
=============================== */

let IA_CACHE = [];

try {

  const cachePath = path.resolve("backend/data/ia_cache_base.json");

  if (fs.existsSync(cachePath)) {

    const raw = fs.readFileSync(cachePath, "utf-8");
    const json = JSON.parse(raw);

    if (Array.isArray(json)) {
      IA_CACHE = json;
    }

  }

} catch (err) {
  console.error("Erro cache IA:", err);
}

/* ===============================
MEMORY
=============================== */

const MEMORY = new Map();
const CONTEXT = new Map();

const MAX_HISTORY = 10;

function getHistory(id) {
  return MEMORY.get(id) || [];
}

function getContext(id) {
  return CONTEXT.get(id) || {};
}

function saveTurn(id, role, content) {

  const h = getHistory(id);

  h.push({ role, content });

  MEMORY.set(
    id,
    h.slice(-MAX_HISTORY * 2)
  );

}

/* ===============================
EXTRACT CONTEXT
=============================== */

function extractContext(text, id) {

  const ctx = getContext(id);

  const budgetMatch = text.match(/\b\d{3,5}\b/);

  if (budgetMatch && !ctx.budget) {
    ctx.budget = budgetMatch[0];
  }

  if (/jogo|fps|valorant|cs2|fortnite/.test(text)) {
    ctx.use = "gaming";
  }

  if (/programar|programação|faculdade|estudo/.test(text)) {
    ctx.use = "study";
  }

  if (/edição|render|design|trabalho/.test(text)) {
    ctx.use = "work";
  }

  CONTEXT.set(id, ctx);

}

/* ===============================
NORMALIZE
=============================== */

function normalize(text = "") {

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

}

/* ===============================
CACHE KEYWORD
=============================== */

function matchByKeyword(text) {

  const t = normalize(text);

  for (const item of IA_CACHE) {

    if (!item.keywords) continue;

    for (const kw of item.keywords) {

      if (t.includes(normalize(kw))) {

        if (item.replyTemplates?.length) {

          return item.replyTemplates[
            Math.floor(Math.random() * item.replyTemplates.length)
          ];

        }

      }

    }

  }

  return null;

}

/* ===============================
CACHE INTENT
=============================== */

function matchByIntent(intent) {

  if (!intent) return null;

  for (const item of IA_CACHE) {

    if (item.intent === intent.intent) {

      if (item.replyTemplates?.length) {

        return item.replyTemplates[
          Math.floor(Math.random() * item.replyTemplates.length)
        ];

      }

    }

  }

  return null;

}

/* ===============================
PROMPT
=============================== */

function buildPrompt(persona, intent, ctx) {

  let personaBlock = "";

  if (persona) {

    personaBlock = `

PERSONA
${persona.label}

Função
${persona.role}

Tom
${persona.tone}

`;

  }

  let intentBlock = "";

  if (intent) {

    intentBlock = `

INTENT
${intent.intent}

`;

  }

  let contextBlock = "";

  if (ctx.budget || ctx.use) {

    contextBlock = `

CONTEXTO DO CLIENTE

Orçamento: ${ctx.budget || "não informado"}
Uso: ${ctx.use || "não informado"}

`;

  }

  return `
Você é Nayla da Nexus Store.

Função
Ajudar clientes a escolher hardware e produtos.

Regras

Nunca repita saudação
Continue a conversa
Use o contexto do cliente
Faça perguntas úteis
Seja direta

${personaBlock}

${intentBlock}

${contextBlock}
`;

}

/* ===============================
ROUTER
=============================== */

export async function routeMessage(message, context = {}) {

  const conversationId = context.conversationId || "guest";

  const text = normalizeSlang(message);

  extractContext(text, conversationId);

  const ctx = getContext(conversationId);

  const history = getHistory(conversationId);

  const intent = detectIntent(text);

  const persona = selectPersona(text);

  if (history.length === 0) {

    const keywordMatch = matchByKeyword(text);

    if (keywordMatch) {

      saveTurn(conversationId, "user", text);
      saveTurn(conversationId, "assistant", keywordMatch);

      return {
        reply: keywordMatch,
        suggestions: []
      };

    }

    const intentMatch = matchByIntent(intent);

    if (intentMatch) {

      saveTurn(conversationId, "user", text);
      saveTurn(conversationId, "assistant", intentMatch);

      return {
        reply: intentMatch,
        suggestions: []
      };

    }

  }

  const input = [

    {
      role: "system",
      content: buildPrompt(persona, intent, ctx)
    },

    ...history,

    {
      role: "user",
      content: text
    }

  ];

  let reply = "";

  try {

    const resp = await client.responses.create({

      model: "gpt-4o-mini",
      input,
      temperature: 0.8,
      max_output_tokens: 300

    });

    reply =
      resp.output_text?.trim() ||
      "Me explica melhor o que você procura.";

  } catch (err) {

    console.error("OpenAI erro:", err);

    reply = "Tive um problema aqui. Pode repetir?";

  }

  saveTurn(conversationId, "user", text);
  saveTurn(conversationId, "assistant", reply);

  return {
    reply,
    suggestions: []
  };

}