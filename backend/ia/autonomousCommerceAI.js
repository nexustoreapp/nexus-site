// backend/ia/autonomousCommerceAI.js

export function autonomousCommerceDecision(ctx){

  if(ctx.buyScore > 8){
    return "close_sale";
  }

  if(ctx.stage === "recommendation"){
    return "show_products";
  }

  if(!ctx.budget){
    return "collect_budget";
  }

  if(!ctx.use){
    return "collect_use";
  }

  return "conversation";

}