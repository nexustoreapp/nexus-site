import OpenAI from "openai";

import { detectIntent } from "../ia/intentMatcher.js";
import { selectPersona } from "../ia/personaSelector.js";
import { normalizeSlang } from "../ia/slangNormalizer.js";
import { searchCatalog } from "../utils/catalogCache.js";

import {
  detectLanguage,
  greetingByLang
} from "../ia/conversationEngine.js";

import { updateMemoryScore } from "../ia/memoryScore.js";

import {
  predictConversationPath,
  pathResponse
} from "../ia/conversationPredictor.js";

import { predictIntentEarly } from "../ia/intentPredictor.js";

import {
  detectBuyIntent,
  salesStrategy
} from "../ia/salesBrain.js";

import { detectCustomerType } from "../ia/customerProfile.js";

import { humanize } from "../ia/humanStyle.js";

import {
  getResponseCache,
  setResponseCache
} from "../ia/responseCache.js";

import {
  storeConversationSample,
  getSimilarReply
} from "../ia/conversationLearning.js";

import { learnFromConversation } from "../ia/selfEvolvingAI.js";

import {
  registerSearch,
  registerPriceRange
} from "../ia/marketIntelligence.js";

import {
  chooseProductStrategy,
  generateSalesAction
} from "../ia/salesAgent.js";

import {
  rankProductsByNeural
} from "../ia/neuralCommerce.js";

import {
  predictBudget,
  predictUse
} from "../ia/predictiveCommerce.js";

import {
  registerSearch as registerBehaviorSearch
} from "../ia/behavioralSignals.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
  MEMORY.set(id,h.slice(-MAX_HISTORY*2));
}

/* ===============================
CONTEXT EXTRACTION
=============================== */

function extractContext(text,id){

  const ctx = getContext(id);

  const predictedBudget = predictBudget(text);
  const predictedUse = predictUse(text);

  const budgetMatch = text.match(/\b\d{3,6}\b/);

  if(budgetMatch && !ctx.budget){
    ctx.budget = Number(budgetMatch[0]);
    registerPriceRange(ctx.budget);
  }

  if(!ctx.budget && predictedBudget){
    ctx.budget = predictedBudget;
  }

  if(!ctx.use && predictedUse){
    ctx.use = predictedUse;
  }

  if(/jogar|jogo|game|gaming|fps/.test(text)){
    ctx.use = "gaming";
  }

  if(/programar|faculdade|estudo/.test(text)){
    ctx.use = "study";
  }

  if(/edição|render|design|trabalho/.test(text)){
    ctx.use = "work";
  }

  if(!ctx.stage){
    ctx.stage = "discovery";
  }

  if(ctx.budget && ctx.use){
    ctx.stage = "recommendation";
  }

  CONTEXT.set(id,ctx);
}

/* ===============================
PRODUCT FILTER
=============================== */

function filterByBudget(products,budget){
  if(!budget) return products;
  return products.filter(p=>{
    const price = Number(p.price || 0);
    return price <= budget;
  });
}

function rankProducts(products){
  if(!Array.isArray(products)) return [];
  return products.sort((a,b)=>{
    return Number(a.price||0) - Number(b.price||0);
  });
}

function limitProducts(products){
  if(!Array.isArray(products)) return [];
  return products.slice(0,3);
}

/* ===============================
PROMPT
=============================== */

function buildPrompt(persona,intent,ctx){
  return `
Você é Nayla da Nexus Store.
Ajude clientes a escolher hardware.

Orçamento: ${ctx.budget || "não informado"}
Uso: ${ctx.use || "não informado"}
Idioma: ${ctx.lang || "pt"}

Persona: ${persona?.label || "assistente"}
Intent: ${intent?.intent || "unknown"}
`;
}

/* ===============================
ROUTER
=============================== */

export async function routeMessage(message,context={}){

  const conversationId = context.conversationId || "guest";
  const text = normalizeSlang(message);

  let ctx = getContext(conversationId);

  registerSearch(text);
  registerBehaviorSearch(text);

  const lang = detectLanguage(context.headers || {});
  ctx.lang = lang;

  if(!ctx.started){

    ctx.started = true;
    CONTEXT.set(conversationId, ctx);

    const greeting = greetingByLang(lang);

    return {
      reply:greeting,
      products:[],
      suggestions:[]
    };
  }

  extractContext(text,conversationId);
  ctx = getContext(conversationId);

  updateMemoryScore(ctx,text);

  let intent = detectIntent(text);

  if(!intent){
    const predicted = predictIntentEarly(text);
    if(predicted){
      intent = { intent: predicted };
    }
  }

  learnFromConversation(intent);

  const customerType = detectCustomerType(text);
  ctx.customerType = customerType;

  const buyScore = detectBuyIntent(text);
  const strategy = salesStrategy(buyScore);

  ctx.buyScore = buyScore;
  ctx.salesStrategy = strategy;

  const persona = selectPersona(text);

  const cached = getResponseCache(text);

  if(cached){
    return {
      reply:cached,
      products:[],
      suggestions:[]
    };
  }

  /* ===============================
RECOMMENDATION PRIORITY
=============================== */

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
  products = rankProductsByNeural(products);
  products = limitProducts(products);

  const salesMode = chooseProductStrategy(ctx);
  const actionProducts = generateSalesAction(salesMode,products);

  if(actionProducts && actionProducts.length){

    return {
      reply: humanize("Achei algumas opções que fazem bastante sentido para você 👇"),
      products: actionProducts,
      suggestions:[]
    };
  }

  /* ===============================
CONVERSATION PREDICTOR
=============================== */

  const path = predictConversationPath(ctx,intent);
  const pathReply = pathResponse(path,ctx);

  if(pathReply){

    const reply = humanize(pathReply);

    setResponseCache(text,reply);

    saveTurn(conversationId,"assistant",reply);

    return {
      reply,
      products,
      suggestions:[]
    };
  }

  const learned = getSimilarReply(text);

  if(learned){
    return {
      reply:learned,
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
    reply = "Pode me contar um pouco mais do que você procura?";
  }

  reply = humanize(reply);

  setResponseCache(text,reply);
  storeConversationSample(text,reply);

  saveTurn(conversationId,"user",text);
  saveTurn(conversationId,"assistant",reply);

  return {
    reply,
    products,
    suggestions:[]
  };
}