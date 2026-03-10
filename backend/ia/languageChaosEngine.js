// backend/ia/languageChaosEngine.js

const patterns = [
  { regex: /(pc|computador).*(jogar|game|gaming)/i, intent: "pc_gaming" },
  { regex: /(pc|computador).*(trabalho|render|edição)/i, intent: "pc_work" },
  { regex: /(pc|computador).*(estudo|faculdade)/i, intent: "pc_study" },
  { regex: /(montar|buildar|fazer).*(pc)/i, intent: "pc_build" },
  { regex: /(pc gamer|setup gamer)/i, intent: "pc_gaming" }
];

export function interpretChaos(text){

  if(!text) return null;

  const t = text.toLowerCase();

  for(const p of patterns){
    if(p.regex.test(t)){
      return p.intent;
    }
  }

  return null;
}