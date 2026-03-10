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
    ctx.budget = Number(budgetMatch[0]);
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

  if(/comprar|pegar|vou levar|quero esse|como comprar/.test(text)){
    ctx.stage = "decision";
  }

  if (!ctx.stage) ctx.stage = "discovery";

  if (ctx.budget && ctx.use && ctx.stage === "discovery") {
    ctx.stage = "recommendation";
  }

  CONTEXT.set(id, ctx);

}

/* ===============================
LOCAL QUICK RESPONSES
=============================== */

function quickResponse(text){

  const t = text.toLowerCase().trim();

  if(/^(oi|olá|ola|eai|e aí|hey)$/.test(t)){
    return "Oi! 👋 Posso te ajudar a escolher um PC ou algum hardware.";
  }

  if(/^(ok|blz|beleza|entendi)$/.test(t)){
    return "Perfeito 👍 Me conta então: você pretende usar mais para jogos 🎮, estudo 📚 ou trabalho 💼?";
  }

  return null;

}

/* ===============================
LOCAL FALLBACK
=============================== */

function localFallback(ctx){

  if(ctx.stage === "discovery" && !ctx.use){

    if(!ctx.askUseCount){
      ctx.askUseCount = 1;
      return "Você pretende usar mais para jogos 🎮, estudo 📚 ou trabalho 💼?";
    }

    if(ctx.askUseCount === 1){
      ctx.askUseCount++;
      return "Para eu te recomendar algo certo, preciso saber: você quer usar mais para jogar, estudar ou trabalhar?";
    }

    return "Pode me dizer se o PC é mais para jogos, estudo ou trabalho?";
  }

  if(ctx.stage === "discovery" && !ctx.budget){
    return "Você já tem algum orçamento em mente?";
  }

  if(ctx.stage === "recommendation" && ctx.budget){
    return `Com um orçamento perto de ${ctx.budget}, encontrei algumas opções muito boas para esse tipo de uso 👇`;
  }

  if(ctx.stage === "decision"){
    return "Se quiser ver os detalhes completos, basta abrir o produto que eu te mostrei.";
  }

  return "Pode me contar um pouco mais do que você procura?";
}

/* ===============================
FILTER BY BUDGET
=============================== */

function filterByBudget(products, budget){

  if(!budget) return products;

  return products.filter(p=>{
    const price = Number(p.price || 0);
    return price <= budget;
  });

}

/* ===============================
RANK PRODUCTS
=============================== */

function rankProducts(products){

  if(!Array.isArray(products)) return [];

  return products.sort((a,b)=>{

    const pa = Number(a.price || 0);
    const pb = Number(b.price || 0);

    return pa - pb;

  });

}

/* ===============================
LIMIT PRODUCTS
=============================== */

function limitProducts(products){

  if(!Array.isArray(products)) return [];

  return products.slice(0,3);

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

Sempre descubra uso e orçamento antes de recomendar produto.

Quando sugerir um produto:
- explique em uma frase por que ele é bom
- sugira um complemento ou upgrade

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

  const quick = quickResponse(text);

  if(quick){
    return {
      reply: quick,
      products: [],
      suggestions:[]
    };
  }

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

  products = filterByBudget(products, ctx.budget);
  products = rankProducts(products);
  products = limitProducts(products);

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
      temperature:0.7,
      max_output_tokens:200

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