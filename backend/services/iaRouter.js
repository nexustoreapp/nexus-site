import OpenAI from "openai";

import { detectIntent } from "../ia/intentMatcher.js";
import { selectPersona } from "../ia/personaSelector.js";
import { normalizeSlang } from "../ia/slangNormalizer.js";
import { searchCatalog } from "../utils/catalogCache.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ===============================
MEMORY
=============================== */

const MEMORY = new Map();
const CONTEXT = new Map();

const MAX_HISTORY = 10;

function getHistory(id){
  return MEMORY.get(id) || [];
}

function getContext(id){
  return CONTEXT.get(id) || {};
}

function saveTurn(id,role,content){

  const h = getHistory(id);

  h.push({role,content});

  MEMORY.set(
    id,
    h.slice(-MAX_HISTORY*2)
  );

}

/* ===============================
CONTEXT MEMORY
=============================== */

function updateIntentMemory(ctx,intent,persona){

  if(intent){
    ctx.lastIntent = intent.intent || intent.id;
  }

  if(persona){
    ctx.lastPersona = persona.id;
  }

  if(intent?.intent === "pc_help"){
    ctx.conversationGoal = "pc_build";
  }

  if(intent?.intent === "product_search"){
    ctx.conversationGoal = "product_search";
  }

}

/* ===============================
EXTRACT CONTEXT
=============================== */

function extractContext(text,id){

  const ctx = getContext(id);

  const budgetMatch = text.match(/\b\d{3,6}\b/);

  if(budgetMatch && !ctx.budget){
    ctx.budget = Number(budgetMatch[0]);
  }

  if(/jogo|fps|valorant|cs2|fortnite/.test(text)){
    ctx.use = "gaming";
  }

  if(/programar|programação|faculdade|estudo/.test(text)){
    ctx.use = "study";
  }

  if(/edição|render|design|trabalho/.test(text)){
    ctx.use = "work";
  }

  if(/comprar|pegar|vou levar|quero esse|como comprar/.test(text)){
    ctx.stage = "decision";
  }

  if(!ctx.stage) ctx.stage = "discovery";

  if(ctx.budget && ctx.use && ctx.stage==="discovery"){
    ctx.stage = "recommendation";
  }

  CONTEXT.set(id,ctx);

}

/* ===============================
QUICK RESPONSES
=============================== */

function quickResponse(text){

  const t = text.toLowerCase().trim();

  if(/^(oi|olá|ola|eai|e aí|hey|yo)$/i.test(t)){
    return "Oi! 👋 Posso te ajudar a escolher um PC ou algum hardware.";
  }

  if(/^(ok|blz|beleza)$/i.test(t)){
    return "Perfeito 👍 Quer usar mais para jogos 🎮, estudo 📚 ou trabalho 💼?";
  }

  return null;

}

/* ===============================
LOCAL FALLBACK
=============================== */

function localFallback(ctx){

  if(ctx.stage==="discovery" && !ctx.use){
    return "O que você pretende fazer com o PC normalmente?";
  }

  if(ctx.stage==="discovery" && !ctx.budget){
    return "Você já tem algum orçamento em mente?";
  }

  if(ctx.stage==="recommendation" && ctx.budget){
    return `Com um orçamento perto de ${ctx.budget}, encontrei algumas opções boas 👇`;
  }

  if(ctx.stage==="decision"){
    return "Se quiser ver os detalhes completos é só abrir o produto que te mostrei.";
  }

  return "Me conta um pouco mais do que você procura.";
}

/* ===============================
FILTER BY BUDGET
=============================== */

function filterByBudget(products,budget){

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

function buildPrompt(persona,intent,ctx){

  let personaBlock="";

  if(persona){

    personaBlock=`

PERSONA
${persona.label}

Função
${persona.role}

Tom
${persona.tone}

`;

  }

  let intentBlock="";

  if(intent){

    intentBlock=`

INTENT
${intent.intent}

`;

  }

  let contextBlock="";

  if(ctx.budget || ctx.use){

    contextBlock=`

CONTEXTO DO CLIENTE

Orçamento: ${ctx.budget || "não informado"}
Uso: ${ctx.use || "não informado"}
Stage: ${ctx.stage}
Goal: ${ctx.conversationGoal || "none"}

`;

  }

  return `
Você é Nayla da Nexus Store.
Ajude clientes a escolher hardware.

Fluxo:
discovery → descobrir necessidade
recommendation → sugerir produto
decision → ajudar decisão

${personaBlock}
${intentBlock}
${contextBlock}
`;

}

/* ===============================
ROUTER
=============================== */

export async function routeMessage(message,context={}){

  const conversationId = context.conversationId || "guest";

  const text = normalizeSlang(message);

  const quick = quickResponse(text);

  if(quick){
    return {
      reply:quick,
      products:[],
      suggestions:[]
    };
  }

  extractContext(text,conversationId);

  const ctx = getContext(conversationId);

  const intent = detectIntent(text);
  const persona = selectPersona(text);

  updateIntentMemory(ctx,intent,persona);

  let products=[];

  if(ctx.stage==="recommendation"){

    if(ctx.use==="gaming"){
      products = searchCatalog("gpu");
    }

    if(ctx.use==="study"){
      products = searchCatalog("notebook");
    }

    if(ctx.use==="work"){
      products = searchCatalog("workstation");
    }

  }

  products = filterByBudget(products,ctx.budget);
  products = rankProducts(products);
  products = limitProducts(products);

  if(intent?.replyTemplates?.length){

    const replies = intent.replyTemplates;

    const reply = replies[Math.floor(Math.random()*replies.length)];

    saveTurn(conversationId,"user",text);
    saveTurn(conversationId,"assistant",reply);

    return {
      reply,
      products,
      suggestions:[]
    };

  }

  const history = getHistory(conversationId);

  const input=[

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
      max_output_tokens:150

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