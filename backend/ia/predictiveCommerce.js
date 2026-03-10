// backend/ia/predictiveCommerce.js

export function predictBudget(text){

  const numbers = text.match(/\d{3,6}/g);

  if(numbers && numbers.length){
    return Number(numbers[0]);
  }

  return null;

}

export function predictUse(text){

  const t = text.toLowerCase();

  if(/jogo|fps|valorant|cs|fortnite/.test(t)){
    return "gaming";
  }

  if(/estudo|faculdade|programar/.test(t)){
    return "study";
  }

  if(/trabalho|edição|design|render/.test(t)){
    return "work";
  }

  return "general";

}

export function predictiveSuggestion(ctx){

  if(ctx.budget && ctx.use){
    return null;
  }

  if(ctx.use==="gaming"){
    return "Se a ideia for jogar, normalmente algo na faixa de 3000 já começa a rodar bastante coisa.";
  }

  if(ctx.use==="study"){
    return "Para estudo normalmente um notebook equilibrado já resolve bem.";
  }

  if(ctx.use==="work"){
    return "Para trabalho depende muito do tipo de tarefa, mas dá para montar algo bem eficiente.";
  }

  return null;

}