// backend/ia/commerceContextBuilder.js

export function buildCommerceContext(state){

  const ctx = {
    readyForRecommendation:false,
    missingBudget:false,
    missingUse:false
  };

  if(!state.budget){
    ctx.missingBudget = true;
  }

  if(!state.use){
    ctx.missingUse = true;
  }

  if(state.budget && state.use){
    ctx.readyForRecommendation = true;
  }

  return ctx;

}