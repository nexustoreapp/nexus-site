// backend/ia/neuralProductMatcher.js

export function neuralMatchProducts(products,ctx){

  if(!Array.isArray(products)) return [];

  const use = ctx.use || null;
  const budget = ctx.budget || null;
  const stage = ctx.stage || "discovery";

  const scored = products.map(p=>{

    let score = 0;

    const name = String(p.name || "").toLowerCase();

    /* ===============================
USE MATCH
=============================== */

    if(use === "gaming"){

      if(/rtx|radeon|rx|gtx|gpu|geforce|placa/.test(name)){
        score += 6;
      }

    }

    if(use === "study"){

      if(/notebook|laptop|ultrabook/.test(name)){
        score += 5;
      }

    }

    if(use === "work"){

      if(/workstation|pro|creator/.test(name)){
        score += 5;
      }

    }

    /* ===============================
BUDGET MATCH
=============================== */

    if(budget && p.price){

      const price = Number(p.price);

      const diff = Math.abs(price - budget);

      /* muito próximo do orçamento */

      if(diff < budget * 0.15){
        score += 5;
      }

      /* aceitável */

      else if(diff < budget * 0.30){
        score += 3;
      }

      /* acima do orçamento */

      if(price > budget){
        score -= 1;
      }

    }

    /* ===============================
CUSTOMER PROFILE
=============================== */

    if(ctx.customerType === "technical"){
      score += 2;
    }

    /* ===============================
CONVERSATION STAGE
=============================== */

    if(stage === "recommendation"){
      score += 2;
    }

    return {
      product: p,
      score
    };

  });

  scored.sort((a,b)=>b.score-a.score);

  return scored.map(s=>s.product);

}