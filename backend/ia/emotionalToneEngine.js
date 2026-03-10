// backend/ia/emotionalToneEngine.js

export function applyEmotion(text,ctx){

  if(!text) return text;

  if(ctx.customerType === "beginner"){
    return "Relaxa 😄 " + text;
  }

  if(ctx.customerType === "advanced"){
    return "Beleza 👍 " + text;
  }

  return text;
}