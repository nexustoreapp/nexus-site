// backend/ia/recommendationStrategy.js

export function chooseRecommendationStrategy(ctx){

  if(ctx.budget <= 3000){
    return "budget_build";
  }

  if(ctx.budget <= 6000){
    return "mid_range";
  }

  if(ctx.budget > 6000){
    return "high_end";
  }

  return "default";
}