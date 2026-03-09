import OpenAI from "openai";
import fs from "fs";
import path from "path";

import { detectIntent } from "../ia/intentMatcher.js";
import { selectPersona } from "../ia/personaSelector.js";
import { normalizeSlang } from "../ia/slangNormalizer.js";
import { searchCatalog } from "../utils/catalogCache.js";

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

  const budgetMatch = text.match(/\b\d{3,6}\b/);

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

  if (!ctx.stage) ctx.stage = "discovery";

  if (ctx.budget && ctx.use && ctx.stage === "discovery") {
    ctx.stage = "recommendation";
  }

  CONTEXT.set(id, ctx);

}

/* ===============================
LOCAL FALLBACK
=============================== */

function localFallback(ctx){

  if(ctx.stage === "discovery" && !ctx.use){
    return "Você pretende usar mais para jogos, estudo ou trabalho?";
  }

  if(ctx.stage === "discovery" && !ctx.budget){
    return "Você já tem algum orçamento em mente?";
  }

  if(ctx.stage === "recommendation" && ctx.budget){
    return `Com um orçamento perto de ${ctx.budget}, encontrei algumas opções muito boas para esse tipo de uso 👇`;
  }

  return "Pode me contar um pouco mais do que você procura?";
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
Stage: ${ctx.stage}

`;

  }

  return `
Você é Nayla da Nexus Store.

Função
Ajudar clientes a escolher hardware.

Fluxo de conversa

discovery → descobrir necessidade
recommendation → sugerir produto
decision → ajudar decisão

Nunca volte para saudação depois da primeira mensagem.

Sempre descubra uso e orçamento antes de recomendar produto.

Quando sugerir um produto, explique em uma frase simples
por que ele é uma boa escolha.

Após recomendar algo, sugira também
um upgrade ou complemento relacionado.

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

  let products = [];

  if(ctx.stage === "recommendation"){

    if(ctx.use === "gaming"){
      products = searchCatalog("gpu");
    }

    if(ctx.use === "study"){
      products = searchCatalog("notebook");
    }

    if(ctx.use === "work"){
      products = searchCatalog("workstation");
    }

  }

  const input = [

    {
      role:"system",
      content:buildPrompt(persona,intent,ctx)
    },

    ...history,

    {
      role:"user",
      content:text
    }

  ];

  let reply="";

  try{

    const resp = await client.responses.create({

      model:"gpt-4o-mini",
      input,
      temperature:0.8,
      max_output_tokens:300

    });

    reply = resp.output_text?.trim();

  }catch(err){

    console.error("OpenAI erro:",err);

  }

  if(!reply){
    reply = localFallback(ctx);
  }

  saveTurn(conversationId,"user",text);
  saveTurn(conversationId,"assistant",reply);

  return {
    reply,
    products,
    suggestions:[]
  };

}