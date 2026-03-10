// backend/ia/salesAgent.js

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

export function generateSalesAction(strategy,products){

  if(strategy==="conversation"){
    return null;
  }

  if(strategy==="recommend"){
    return products.slice(0,2);
  }

  if(strategy==="direct_offer"){
    return products.slice(0,1);
  }

  return null;

}