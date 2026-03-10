// backend/ia/commerceBrain.js

export function commerceDecision(ctx){

  if(ctx.stage === "recommendation" && ctx.buyScore > 5){
    return "show_products";
  }

  if(ctx.stage === "recommendation"){
    return "suggest_products";
  }

  if(!ctx.budget){
    return "ask_budget";
  }

  if(!ctx.use){
    return "ask_use";
  }

  return "conversation";

}