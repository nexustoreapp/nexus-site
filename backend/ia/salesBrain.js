// backend/ia/salesBrain.js

/* ===============================
BUY INTENT DETECTION
=============================== */

export function detectBuyIntent(text){

  const t = String(text || "").toLowerCase();

  let score = 0;

  /* ===============================
EXPLICIT BUY
=============================== */

  if(/quero comprar|vou comprar|vou levar|vou pegar|fechar compra/.test(t)){
    score += 0.9;
  }

  /* ===============================
PRICE SIGNAL
=============================== */

  if(/preço|quanto custa|valor|quanto sai/.test(t)){
    score += 0.4;
  }

  /* ===============================
PRODUCT INTEREST
=============================== */

  if(/esse roda|esse aguenta|esse é bom|vale a pena/.test(t)){
    score += 0.3;
  }

  /* ===============================
PRODUCT COMPARISON
=============================== */

  if(/qual melhor|comparar|diferença entre/.test(t)){
    score += 0.3;
  }

  /* ===============================
DECISION SIGNAL
=============================== */

  if(/qual você recomenda|qual pegar|qual escolher/.test(t)){
    score += 0.5;
  }

  /* ===============================
URGENCY
=============================== */

  if(/agora|hoje|já|imediato/.test(t)){
    score += 0.2;
  }

  return Math.min(score,1);

}

/* ===============================
SALES STRATEGY
=============================== */

export function salesStrategy(score){

  if(score < 0.25){
    return "explore";
  }

  if(score < 0.6){
    return "assist";
  }

  return "convert";

}