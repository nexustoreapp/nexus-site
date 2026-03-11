import { searchCatalog } from "../utils/catalogCache.js";

import { detectIntent } from "./intentMatcher.js";
import { predictIntentEarly } from "./intentPredictor.js";

import { detectCustomerType } from "./customerProfile.js";

import { detectBuyIntent, salesStrategy } from "./salesBrain.js";

import { chooseProductStrategy, generateSalesAction } from "./salesAgent.js";

import { rankProductsByNeural } from "./neuralCommerce.js";

import { neuralMatchProducts } from "./neuralProductMatcher.js";

import { parseMessage } from "./semanticParser.js";
import { getConversationState, updateConversationState } from "./conversationState.js";
import { buildCommerceContext } from "./commerceContextBuilder.js";

/* ===============================
ROUTER
=============================== */

export async function routeMessage(message,context={}){

  const id = context.conversationId || "guest";

  const text = String(message || "").toLowerCase();

  /* ===============================
START
=============================== */

  let state = getConversationState(id);

  if(!state.started){

    state.started = true;

    return {
      reply:"Oi! Eu sou a Nayla 👋 Como posso ajudar?",
      products:[],
      suggestions:[]
    };
  }

  /* ===============================
SEMANTIC PARSER
=============================== */

  const parsed = parseMessage(text);

  state = updateConversationState(id,parsed);

  /* ===============================
INTENT
=============================== */

  const intent = detectIntent(text) || predictIntentEarly(text);

  state.intent = intent;

  /* ===============================
CUSTOMER PROFILE
=============================== */

  state.customerType = detectCustomerType(text);

  state.buyScore = detectBuyIntent(text);

  state.salesStrategy = salesStrategy(state.buyScore);

  /* ===============================
COMMERCE CONTEXT
=============================== */

  const commerceCtx = buildCommerceContext(state);

  /* ===============================
ASK BUDGET
=============================== */

  if(commerceCtx.missingBudget){

    return {
      reply:"Você já tem um orçamento em mente?",
      products:[],
      suggestions:[]
    };

  }

  /* ===============================
ASK USE
=============================== */

  if(commerceCtx.missingUse){

    return {
      reply:"Você pretende usar mais para jogos, estudo ou trabalho?",
      products:[],
      suggestions:[]
    };

  }

  /* ===============================
RECOMMENDATION
=============================== */

  if(commerceCtx.readyForRecommendation){

    let products=[];

    if(state.use === "gaming")
      products = searchCatalog("gpu");

    if(state.use === "study")
      products = searchCatalog("notebook");

    if(state.use === "work")
      products = searchCatalog("workstation");

    products = rankProductsByNeural(products);

    products = neuralMatchProducts(products,state);

    const action = generateSalesAction(
      chooseProductStrategy(state),
      products
    );

    if(action?.length){

      return {
        reply:"Achei algumas opções que fazem bastante sentido para você 👇",
        products:action,
        suggestions:[]
      };

    }

  }

  /* ===============================
FALLBACK
=============================== */

  return {
    reply:"Entendi. Deixa eu analisar algumas opções boas para você.",
    products:[],
    suggestions:[]
  };

}