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

  const number = t.match(/\d{3,6}/);
  if(!result.budget && number){
    result.budget = Number(number[0]);
  }

  /* ===============================
USE
=============================== */

  if(/valorant|cs|cs2|fortnite|jogo|game|gaming/.test(t)){
    result.use = "gaming";
  }

  if(/estudo|faculdade|programar/.test(t)){
    result.use = "study";
  }

  if(/edi[cç][aã]o|render|trabalho|design/.test(t)){
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