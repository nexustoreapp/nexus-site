// backend/ia/salesAgent.js

/* ===============================
CHOOSE STRATEGY
=============================== */

export function chooseProductStrategy(ctx){

  const strategy = ctx.salesStrategy || "explore";

  if(strategy === "explore"){
    return "conversation";
  }

  if(strategy === "assist"){
    return "recommend";
  }

  if(strategy === "convert"){
    return "direct_offer";
  }

  return "conversation";

}

/* ===============================
GENERATE ACTION
=============================== */

export function generateSalesAction(strategy,products){

  if(!Array.isArray(products) || products.length === 0){
    return null;
  }

  /* conversa normal */

  if(strategy === "conversation"){
    return null;
  }

  /* recomendação assistida */

  if(strategy === "recommend"){
    return products.slice(0,3);
  }

  /* oferta direta */

  if(strategy === "direct_offer"){
    return products.slice(0,2);
  }

  return null;

}