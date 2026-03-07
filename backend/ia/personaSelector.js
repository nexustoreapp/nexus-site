import personas from "../data/personas.json";

export function getPersona(personaId){

if(!personaId) return null;

return personas.find(p=>p.id===personaId) || null;

}