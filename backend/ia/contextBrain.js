// backend/ia/contextBrain.js

export function updateContextBrain(ctx){

  if(!ctx) return ctx;

  if(ctx.budget && ctx.use){
    ctx.stage = "recommendation";
  }

  if(ctx.productsShown){
    ctx.stage = "decision";
  }

  if(ctx.buyScore > 70){
    ctx.stage = "closing";
  }

  return ctx;
}