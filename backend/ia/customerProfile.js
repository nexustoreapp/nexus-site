// backend/ia/customerProfile.js

export function detectCustomerType(text){

  const t = String(text || "").toLowerCase();

  /* ===============================
TECHNICAL USER
=============================== */

  if(/benchmark|fps|latencia|clock|vrm|chipset|spec|especifica/.test(t)){
    return "technical";
  }

  /* ===============================
ANALYST (comparador)
=============================== */

  if(/comparar|diferen[çc]a|qual melhor|vale mais a pena/.test(t)){
    return "analyst";
  }

  /* ===============================
BUYER
=============================== */

  if(/quero comprar|vou comprar|vou pegar|vou levar|fechar compra/.test(t)){
    return "buyer";
  }

  /* ===============================
LOST USER
=============================== */

  if(/nao sei|não sei|to perdido|me ajuda|qual escolher/.test(t)){
    return "lost";
  }

  /* ===============================
DEFAULT
=============================== */

  return "explorer";

}