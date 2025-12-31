// backend/suppliers/cj.js

export async function getCJOffer({ sku, region }) {
  return {
    supplier: "CJ Dropshipping",
    origin: "CN",
    price: 160,
    shipping: region === "AF" ? 70 : 55,
    deliveryDays: region === "AF" ? 20 : 15,
  };
}