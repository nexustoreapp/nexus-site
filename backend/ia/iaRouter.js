import { searchCatalog } from "../utils/catalogCache.js";

import { detectIntent } from "./intentMatcher.js";
import { predictIntentEarly } from "./intentPredictor.js";

import { detectCustomerType } from "./customerProfile.js";

import { detectBuyIntent, salesStrategy } from "./salesBrain.js";

import { chooseProductStrategy, generateSalesAction } from "./salesAgent.js";

import { rankProductsByNeural } from "./neuralCommerce.js";

import { neuralMatchProducts } from "./neuralProductMatcher.js";

const CONTEXT = new Map();

/* ===============================
GET CONTEXT
=============================== */

function getContext(id){
  return CONTEXT.get(id) || {};
}

/* ===============================
PARSE BUDGET
=============================== */

function parseBudget(text){

  const t = text.toLowerCase();

  // 25 mil / 25k
  const mil = t.match(/(\d+)\s*(mil|k)/);
  if(mil) return Number(mil[1]) * 1000;

  // 25.549
  const dotted = t.match(/\d{1,3}(\.\d{3})+/);
  if(dotted) return Number(dotted[0].replace(/\./g,""));

  // 25549
  const num = t.match(/\d{3,6}/);
  if(num) return Number(num[0]);

  return null;
}

/* ===============================
DETECT USE
=============================== */

function detectUse(text){

  if(/valorant|cs2|fortnite|jogo|game|gaming/i.test(text))
    return "gaming";

  if(/estudo|faculdade|programar/i.test(text))
    return "study";

  if(/render|edição|design|trabalho/i.test(text))
    return "work";

  return null;
}

/* ===============================
ROUTER
=============================== */

export async function routeMessage(message,context={}){

  const id = context.conversationId || "guest";

  let ctx = getContext(id);

  /* ===============================
START
=============================== */

  if(!ctx.started){

    ctx.started = true;

    CONTEXT.set(id,ctx);

    return {
      reply:"Oi! Eu sou a Nayla 👋 Como posso ajudar?",
      products:[],
      suggestions:[]
    };
  }

  const text = message.toLowerCase();

  /* ===============================
EXTRACT CONTEXT
=============================== */

  const budget = parseBudget(text);
  if(budget) ctx.budget = budget;

  const use = detectUse(text);
  if(use) ctx.use = use;

  /* ===============================
INTENT
=============================== */

  const intent = detectIntent(text) || predictIntentEarly(text);

  ctx.intent = intent;

  /* ===============================
CUSTOMER PROFILE
=============================== */

  ctx.customerType = detectCustomerType(text);

  ctx.buyScore = detectBuyIntent(text);

  ctx.salesStrategy = salesStrategy(ctx.buyScore);

  /* ===============================
STAGE
=============================== */

  if(ctx.budget && ctx.use){
    ctx.stage = "recommendation";
  }

  CONTEXT.set(id,ctx);

  /* ===============================
RECOMMENDATION
=============================== */

  if(ctx.stage === "recommendation"){

    let products=[];

    if(ctx.use === "gaming")
      products = searchCatalog("gpu");

    if(ctx.use === "study")
      products = searchCatalog("notebook");

    if(ctx.use === "work")
      products = searchCatalog("workstation");

    products = rankProductsByNeural(products);

    products = neuralMatchProducts(products,ctx);

    const action = generateSalesAction(
      chooseProductStrategy(ctx),
      products
    );

    if(action?.length){

      ctx.productsShown = true;

      CONTEXT.set(id,ctx);

      return {
        reply:"Achei algumas opções que fazem bastante sentido para você 👇",
        products:action,
        suggestions:[]
      };
    }
  }

  /* ===============================
QUESTIONS
=============================== */

  if(!ctx.budget){

    return {
      reply:"Você já tem um orçamento em mente?",
      products:[],
      suggestions:[]
    };
  }

  if(!ctx.use){

    return {
      reply:"Você pretende usar mais para jogos, estudo ou trabalho?",
      products:[],
      suggestions:[]
    };
  }

  /* ===============================
FALLBACK
=============================== */

  return {
    reply:"Perfeito. Já tenho algumas ideias para você. Deixa eu procurar as melhores opções.",
    products:[],
    suggestions:[]
  };

}