// backend/ia/conversationPredictor.js

export function predictConversationPath(ctx,intent){

  if(!intent){
    return "discovery";
  }

  if(intent.intent === "greeting"){
    return "welcome";
  }

  if(intent.intent === "product_search"){
    return "product_search";
  }

  if(intent.intent === "pc_help"){
    return "pc_build";
  }

  if(intent.intent === "setup_help"){
    return "setup_build";
  }

  if(intent.intent === "compare_products"){
    return "product_compare";
  }

  if(intent.intent === "purchase_problem"){
    return "support";
  }

  return "discovery";

}


export function pathResponse(path,ctx){

  if(path === "welcome"){
    return "E aí! 👋 Me conta o que você está procurando hoje.";
  }

  if(path === "product_search"){
    return "Boa! Que tipo de produto você está procurando?";
  }

  if(path === "pc_build"){

    if(!ctx.budget){
      return "Show. Você tem mais ou menos quanto de orçamento pra montar o PC?";
    }

    return "Legal. Você pretende usar mais para jogos, estudo ou trabalho?";
  }

  if(path === "setup_build"){
    return "Legal montar um setup. Você já tem alguma peça ou vai começar do zero?";
  }

  if(path === "product_compare"){
    return "Boa pergunta. Quais produtos você quer comparar?";
  }

  if(path === "support"){
    return "Sem stress. Me conta o que aconteceu que a gente resolve.";
  }

  return null;

}