// backend/ia/productExplainEngine.js

export function explainProduct(product,ctx){

  if(!product) return null;

  const name = product.name || "esse produto";

  if(ctx.use === "gaming"){
    return `${name} roda jogos competitivos com ótima performance.`;
  }

  if(ctx.use === "work"){
    return `${name} é excelente para produtividade e tarefas pesadas.`;
  }

  if(ctx.use === "study"){
    return `${name} atende muito bem estudos e uso diário.`;
  }

  return `${name} é uma boa opção para seu perfil.`;
}