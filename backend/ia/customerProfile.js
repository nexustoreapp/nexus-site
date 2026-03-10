// backend/ia/customerProfile.js

export function detectCustomerType(text){

  const t = text.toLowerCase();

  if(/comparar|diferença|detalhe/.test(t)){
    return "analyst";
  }

  if(/quero comprar|vou pegar/.test(t)){
    return "buyer";
  }

  if(/não sei|to perdido/.test(t)){
    return "lost";
  }

  return "explorer";

}