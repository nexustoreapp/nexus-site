// backend/ia/conversationSafety.js

export function preventLoop(ctx,text){

  if(!ctx) return false;

  if(ctx.lastQuestion === text){
    return true;
  }

  ctx.lastQuestion = text;

  return false;
}