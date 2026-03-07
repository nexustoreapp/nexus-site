import fs from "fs";
import path from "path";

let PERSONA_CACHE = null;

function loadPersonas(){

  if(PERSONA_CACHE){
    return PERSONA_CACHE;
  }

  try{

    const filePath = path.resolve("backend/data/ia_personas.json");

    const raw = fs.readFileSync(filePath,"utf-8");

    const json = JSON.parse(raw);

    PERSONA_CACHE = Array.isArray(json) ? json : [];

    return PERSONA_CACHE;

  }catch{

    return [];

  }

}

export function selectPersona(message){

  const text = String(message||"").toLowerCase();

  const personas = loadPersonas();

  if(text.includes("pedido") || text.includes("atraso") || text.includes("defeito")){
    return personas.find(p=>p.id==="nexus_guard") || null;
  }

  if(text.includes("fps") || text.includes("valorant") || text.includes("cs") || text.includes("setup")){
    return personas.find(p=>p.id==="gamer_braba") || null;
  }

  if(text.includes("plano") || text.includes("assinatura") || text.includes("upgrade")){
    return personas.find(p=>p.id==="assistente_premium") || null;
  }

  return personas.find(p=>p.id==="vendedor_amigo") || null;

}