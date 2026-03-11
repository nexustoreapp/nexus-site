// backend/ia/predictiveCommerce.js

/* ===============================
PREDICT BUDGET
=============================== */

export function predictBudget(text){

  const t = String(text || "").toLowerCase();

  /* 30 mil / 30k */

  const mil = t.match(/(\d+)\s*(mil|k)/);

  if(mil){
    return Number(mil[1]) * 1000;
  }

  /* 25.549 */

  const dotted = t.match(/\d{1,3}(\.\d{3})+/);

  if(dotted){
    return Number(dotted[0].replace(/\./g,""));
  }

  /* 25549 */

  const numbers = t.match(/\d{3,6}/);

  if(numbers){
    return Number(numbers[0]);
  }

  return null;

}

/* ===============================
PREDICT USE
=============================== */

export function predictUse(text){

  const t = String(text || "").toLowerCase();

  if(/jogar|jogo|game|gaming|valorant|cs2|fortnite|fps/.test(t)){
    return "gaming";
  }

  if(/estudo|faculdade|programar|programacao|estudar/.test(t)){
    return "study";
  }

  if(/trabalho|render|edi[cç][aã]o|design|3d|arquitetura/.test(t)){
    return "work";
  }

  return null;

}

/* ===============================
PREDICTIVE SUGGESTION
=============================== */

export function predictiveSuggestion(ctx){

  if(ctx.budget && ctx.use){
    return null;
  }

  if(ctx.use === "gaming"){
    return "Se a ideia for jogar, normalmente algo entre 3000 e 4000 já começa a rodar bastante coisa.";
  }

  if(ctx.use === "study"){
    return "Para estudo normalmente um notebook equilibrado já resolve bem.";
  }

  if(ctx.use === "work"){
    return "Para trabalho depende bastante da tarefa, mas dá para montar algo bem eficiente.";
  }

  return null;

}