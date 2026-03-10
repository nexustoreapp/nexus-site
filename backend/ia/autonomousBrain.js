// backend/ia/autonomousBrain.js

export function decideAction(ctx){

  if(ctx.buyScore > 7){
    return "offer_product";
  }

  if(ctx.buyScore > 4){
    return "recommend";
  }

  if(ctx.stage === "discovery"){
    return "explore";
  }

  return "conversation";

}

export function actionMessage(action){

  if(action==="offer_product"){
    return "Achei uma opção que encaixa muito bem no que você está procurando 👇";
  }

  if(action==="recommend"){
    return "Separei algumas opções que podem fazer sentido para você 👇";
  }

  if(action==="explore"){
    return "Deixa eu entender melhor o que você precisa.";
  }

  return null;

}