import personas from "../data/personas.json";
import intents from "../data/intents.json";

export function selectPersona(message){

const text = String(message||"").toLowerCase();

for(const intent of intents){

for(const kw of intent.keywords){

if(text.includes(kw)){

const persona = personas.find(
p=>p.id===intent.personaId
);

if(persona){
return persona;
}

}

}

}

return null;

}