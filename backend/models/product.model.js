// backend/models/product.model.js
export function normalizeProduct(raw) {
  return {
    id: raw.id,
    title: raw.title,
    category: raw.category,
    price: raw.price,
    supplier: raw.supplier || "external",
    stockType: "indireto", // 🔑 nunca é estoque próprio
    slaDays: raw.slaDays || 7,
    riskLevel: raw.riskLevel || "normal"
  };
}
