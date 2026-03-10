// backend/ia/adaptiveSalesFlow.js

export function detectConversationMode(ctx){

  if(ctx.buyScore > 7){
    return "buyer";
  }

  if(ctx.customerType === "technical"){
    return "technical";
  }

  if(!ctx.budget && !ctx.use){
    return "lost";
  }

  if(ctx.budget && !ctx.use){
    return "guided";
  }

  if(ctx.budget && ctx.use){
    return "ready";
  }

  return "normal";
}

export function adaptiveSalesResponse(mode,ctx){

  if(mode === "lost"){
    return "Sem stress 🙂 Me conta primeiro quanto você pretende investir no PC.";
  }

  if(mode === "guided"){
    return "Boa! Com esse orçamento dá pra montar algo legal. Você pretende jogar ou usar para estudo/trabalho?";
  }

  if(mode === "technical"){
    return "Massa! Quer comparar peças específicas ou montar um setup completo?";
  }

  if(mode === "buyer"){
    return "Show! Vou te mostrar algumas opções boas agora 👇";
  }

  return null;

}