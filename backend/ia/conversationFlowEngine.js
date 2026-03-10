// backend/ia/conversationFlowEngine.js

export function decideNextStep(ctx){

  if(!ctx.budget){
    return "ask_budget";
  }

  if(!ctx.use){
    return "ask_use";
  }

  if(ctx.stage === "recommendation"){
    return "recommend_products";
  }

  if(ctx.stage === "decision"){
    return "assist_decision";
  }

  return "discovery";
}