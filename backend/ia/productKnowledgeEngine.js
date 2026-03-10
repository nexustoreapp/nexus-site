// backend/ia/productKnowledgeEngine.js

const knowledge = {
  valorant: {
    cpu: "Ryzen 5 5600",
    ram: "16GB",
    gpu: "RTX 4060"
  },
  cs2: {
    cpu: "Ryzen 5 5600",
    ram: "16GB",
    gpu: "RTX 4060"
  },
  fortnite: {
    cpu: "Ryzen 7",
    ram: "16GB",
    gpu: "RTX 4060"
  }
};

export function getGameHardware(game){

  if(!game) return null;

  const g = game.toLowerCase();

  return knowledge[g] || null;
}