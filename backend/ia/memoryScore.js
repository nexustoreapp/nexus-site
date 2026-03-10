// backend/ia/memoryScore.js

export function updateMemoryScore(ctx, text){

  if(!ctx.memoryScore){
    ctx.memoryScore = {};
  }

  const scores = ctx.memoryScore;

  const budget = text.match(/\b\d{3,6}\b/);

  if(budget){

    scores.budget = {
      value: Number(budget[0]),
      score: 10
    };

    ctx.budget = Number(budget[0]);

  }

  if(/jogo|fps|valorant|cs2|fortnite/.test(text)){

    scores.use = {
      value: "gaming",
      score: 9
    };

    ctx.use = "gaming";

  }

  if(/trabalho|render|edição|design/.test(text)){

    scores.use = {
      value: "work",
      score: 9
    };

    ctx.use = "work";

  }

  if(/estudo|faculdade|programação/.test(text)){

    scores.use = {
      value: "study",
      score: 9
    };

    ctx.use = "study";

  }

  return ctx;

}


export function shouldAskBudget(ctx){

  if(!ctx.memoryScore) return true;

  if(ctx.memoryScore.budget && ctx.memoryScore.budget.score > 0){
    return false;
  }

  return true;

}


export function shouldAskUse(ctx){

  if(!ctx.memoryScore) return true;

  if(ctx.memoryScore.use && ctx.memoryScore.use.score > 0){
    return false;
  }

  return true;

}