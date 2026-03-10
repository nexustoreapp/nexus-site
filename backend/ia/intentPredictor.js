// backend/ia/intentPredictor.js

export function predictIntentEarly(text){

  const t = String(text || "").toLowerCase();

  if(/pc|computador|setup/.test(t)){
    return "pc_help";
  }

  if(/placa de video|gpu|rtx|rx/.test(t)){
    return "gpu_help";
  }

  if(/notebook|laptop/.test(t)){
    return "notebook_help";
  }

  if(/monitor|144hz|240hz/.test(t)){
    return "monitor_help";
  }

  if(/setup gamer/.test(t)){
    return "setup_help";
  }

  if(/comprar|produto|catalogo/.test(t)){
    return "product_search";
  }

  if(/problema|erro|não consegui comprar/.test(t)){
    return "purchase_problem";
  }

  return null;

}