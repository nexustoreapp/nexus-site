// backend/ia/semanticParser.js

export function parseMessage(text){

  const t = String(text || "").toLowerCase();

  const result = {
    budget:null,
    use:null,
    intent:null
  };

  /* ===============================
BUDGET
=============================== */

  const mil = t.match(/(\d+)\s*(mil|k)/);
  if(mil){
    result.budget = Number(mil[1]) * 1000;
  }

  const dotted = t.match(/\d{1,3}(\.\d{3})+/);
  if(!result.budget && dotted){
    result.budget = Number(dotted[0].replace(/\./g,""));
  }

  const number = t.match(/\d{3,6}/);
  if(!result.budget && number){
    result.budget = Number(number[0]);
  }

  /* linguagem informal */

  if(/(\d)\s*conto/.test(t)){
    result.budget = Number(t.match(/(\d)\s*conto/)[1]) * 1000;
  }

  /* ===============================
USE
=============================== */

  if(/valorant|cs2|cs|fortnite|jogo|game|gaming/.test(t)){
    result.use = "gaming";
  }

  if(/estudo|faculdade|programar/.test(t)){
    result.use = "study";
  }

  if(/render|edi[cç][aã]o|design|trabalho/.test(t)){
    result.use = "work";
  }

  /* ===============================
INTENT
=============================== */

  if(/pc|computador|setup/.test(t)){
    result.intent = "pc_build";
  }

  if(/placa de video|gpu|rtx|rx/.test(t)){
    result.intent = "gpu_search";
  }

  return result;

}