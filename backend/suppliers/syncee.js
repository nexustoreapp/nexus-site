// backend/suppliers/syncee.js

export async function getSynceeOffer({ sku, region }) {
  // ⚠️ Placeholder REALISTA
  // Aqui depois você liga API/Feed do Syncee

  // Exemplo de retorno REAL que o robô espera
  return {
    supplier: "Syncee",
    origin: region === "BR" ? "BR" : "EU",
    price: 180,
    shipping: region === "BR" ? 20 : 35,
    deliveryDays: region === "BR" ? 6 : 10,
  };
}