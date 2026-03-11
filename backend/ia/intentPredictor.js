// backend/ia/intentPredictor.js

export function predictIntentEarly(text){

  const t = String(text || "").toLowerCase().trim();

  /* ===============================
PC / BUILD
=============================== */

  if(/pc gamer|montar pc|quero um pc|pc pra jogar|pc bom|pc gamer/i.test(t)){
    return { intent:"pc_help" };
  }

  if(/pc|computador|setup pc/i.test(t)){
    return { intent:"pc_help" };
  }

  /* ===============================
GPU
=============================== */

  if(/placa de video|gpu|rtx|rx|nvidia|amd/i.test(t)){
    return { intent:"gpu_help" };
  }

  /* ===============================
NOTEBOOK
=============================== */

  if(/notebook|laptop|ultrabook/i.test(t)){
    return { intent:"notebook_help" };
  }

  /* ===============================
MONITOR
=============================== */

  if(/monitor|144hz|165hz|240hz/i.test(t)){
    return { intent:"monitor_help" };
  }

  /* ===============================
SETUP
=============================== */

  if(/setup gamer|setup completo|mesa gamer/i.test(t)){
    return { intent:"setup_help" };
  }

  /* ===============================
SHOPPING
=============================== */

  if(/comprar|produto|catalogo|catalog/i.test(t)){
    return { intent:"product_search" };
  }

  /* ===============================
SUPPORT
=============================== */

  if(/problema|erro|nao consegui comprar|falhou pagamento/i.test(t)){
    return { intent:"purchase_problem" };
  }

  return null;

}