// backend/suppliers/syncee.js

import fetch from "node-fetch";

// =======================
// CONFIG SYNCEE
// =======================
const SYNCEE_API_BASE = "https://api.syncee.com";
const SYNCEE_API_KEY = process.env.SYNCEE_API_KEY;

// =======================
// COTAÇÃO REAL DO SYNCEE
// =======================
export async function quoteFromSyncee(map) {
  try {
    if (!SYNCEE_API_KEY) {
      throw new Error("SYNCEE_API_KEY_NOT_DEFINED");
    }

    // map.supplierProductId = ID REAL DO PRODUTO NO SYNCEE
    const url = `${SYNCEE_API_BASE}/v1/products/${map.supplierProductId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SYNCEE_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // =======================
    // NORMALIZAÇÃO
    // =======================
    return {
      productId: data.id,
      price: Number(data.price),
      currency: data.currency || "BRL",
      inStock: data.stock > 0,
      shipTo: data.shippingCountries || [],
      supplier: "syncee"
    };

  } catch (err) {
    console.error("[SYNCEE ERROR]", err.message);
    return null;
  }
}
