import OpenAI from "openai";

import { detectIntent } from "../ia/intentMatcher.js";
import { selectPersona } from "../ia/personaSelector.js";
import { normalizeSlang } from "../ia/slangNormalizer.js";
import { searchCatalog } from "../utils/catalogCache.js";

import { detectLanguage, greetingByLang } from "../ia/conversationEngine.js";

import { updateMemoryScore } from "../ia/memoryScore.js";

import { predictConversationPath, pathResponse } from "../ia/conversationPredictor.js";

import { predictIntentEarly } from "../ia/intentPredictor.js";

import { detectBuyIntent, salesStrategy } from "../ia/salesBrain.js";

import { detectCustomerType } from "../ia/customerProfile.js";

import { humanize } from "../ia/humanStyle.js";

import { getResponseCache, setResponseCache } from "../ia/responseCache.js";

import { storeConversationSample, getSimilarReply } from "../ia/conversationLearning.js";

import { learnFromConversation } from "../ia/selfEvolvingAI.js";

import { registerSearch, registerPriceRange } from "../ia/marketIntelligence.js";

import { chooseProductStrategy, generateSalesAction } from "../ia/salesAgent.js";

import { rankProductsByNeural } from "../ia/neuralCommerce.js";

import { predictBudget, predictUse } from "../ia/predictiveCommerce.js";

import { registerSearch as registerBehaviorSearch } from "../ia/behavioralSignals.js";

import { detectConversationMode, adaptiveSalesResponse } from "../ia/adaptiveSalesFlow.js";

import { commerceDecision } from "../ia/commerceBrain.js";

import { mapCustomerIntent } from "../ia/customerIntentGraph.js";

import { neuralMatchProducts } from "../ia/neuralProductMatcher.js";

import { autonomousCommerceDecision } from "../ia/autonomousCommerceAI.js";

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
    CONTEXT.set(conversationId,ctx);

    const greeting = greetingByLang(lang);

    return { reply:greeting, products:[], suggestions:[] };

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

  ctx.customerType = detectCustomerType(text);

  ctx.buyScore = detectBuyIntent(text);

  ctx.salesStrategy = salesStrategy(ctx.buyScore);

  const mode = detectConversationMode(ctx);

  const adaptiveReply = adaptiveSalesResponse(mode,ctx);

  if(adaptiveReply){

    return {
      reply: humanize(adaptiveReply),
      products:[],
      suggestions:[]
    };

  }

  ctx.intentGraph = mapCustomerIntent(ctx);

  ctx.commerceDecision = commerceDecision(ctx);

  ctx.autonomousDecision = autonomousCommerceDecision(ctx);

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

  products = rankProductsByNeural(products);

  products = neuralMatchProducts(products,ctx);

  const actionProducts = generateSalesAction(chooseProductStrategy(ctx),products);

  if(actionProducts?.length){

    return {
      reply: humanize("Achei algumas opções que fazem bastante sentido para você 👇"),
      products: actionProducts,
      suggestions:[]
    };

  }

  const path = predictConversationPath(ctx,intent);

  const pathReply = pathResponse(path,ctx);

  if(pathReply){

    return {
      reply: humanize(pathReply),
      products:[],
      suggestions:[]
    };

  }

  const history = getHistory(conversationId);

  const input=[
    { role:"system",content:`Você é Nayla da Nexus Store.` },
    ...history,
    { role:"user",content:text }
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
    console.error(err);
  }

  if(!reply){
    reply = "Pode me contar um pouco mais do que você procura?";
  }

  reply = humanize(reply);

  saveTurn(conversationId,"assistant",reply);

  return {
    reply,
    products,
    suggestions:[]
  };

}