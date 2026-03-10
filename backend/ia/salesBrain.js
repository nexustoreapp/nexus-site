// backend/ia/salesBrain.js

export function detectBuyIntent(text){

  const t = String(text || "").toLowerCase();

  let score = 0;

  if(/quero comprar|vou comprar|preciso comprar/.test(t)){
    score += 0.6;
  }

  if(/preço|quanto custa|valor/.test(t)){
    score += 0.2;
  }

  if(/agora|hoje/.test(t)){
    score += 0.2;
  }

  return Math.min(score,1);

}

export function salesStrategy(score){

  if(score < 0.3){
    return "explore";
  }

  if(score < 0.7){
    return "assist";
  }

  return "convert";

}