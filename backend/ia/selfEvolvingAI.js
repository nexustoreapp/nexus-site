// backend/ia/selfEvolvingAI.js

const STATS = {

  intents: {},
  products: {},
  conversations: 0,
  successfulSuggestions: 0

};


export function learnFromConversation(intent){

  if(!intent) return;

  const key = intent.intent || intent;

  if(!STATS.intents[key]){
    STATS.intents[key] = 0;
  }

  STATS.intents[key]++;

  STATS.conversations++;

}


export function learnProductInterest(productId){

  if(!productId) return;

  if(!STATS.products[productId]){
    STATS.products[productId] = 0;
  }

  STATS.products[productId]++;

}


export function registerSuccessfulSuggestion(){

  STATS.successfulSuggestions++;

}


export function getCommerceInsights(){

  return {

    totalConversations: STATS.conversations,

    topIntents:
      Object.entries(STATS.intents)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5),

    popularProducts:
      Object.entries(STATS.products)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5),

    successRate:
      STATS.conversations === 0
      ? 0
      : STATS.successfulSuggestions / STATS.conversations

  };

}