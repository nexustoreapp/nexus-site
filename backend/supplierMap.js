// backend/supplierMap.js

// =======================
// MAPA DE SKU → FORNECEDOR
// =======================
// ESTE ARQUIVO É O CORAÇÃO DO DROPSHIPPING
// NÃO INVENTA PRODUTO
// NÃO PROCURA "PARECIDO"
// SEMPRE ID EXATO DO FORNECEDOR

const SUPPLIER_MAP = {
  // ================= CPU =================
  "CPU_AMD_RYZEN_8600G_AM5": {
    supplier: "syncee",
    supplierProductId: "525168_79622_38570cc8-42b9-4c45-9a50-4f2e5e3c7e10",
    category: "CPU",
    maxPrice: 2000
  },

  // ================= RAM =================
  "RAM_GSKILL_64GB_DDR5_6400": {
    supplier: "syncee",
    supplierProductId: "525168_81708_cc346a46-5a2f-469b-8fe2-c5d9731eccba",
    category: "Memória RAM",
    maxPrice: 2100
  }

  // 👉 VOCÊ VAI CONTINUAR ADICIONANDO AQUI
};

// =======================
// FUNÇÃO DE BUSCA
// =======================
export function getSupplierBySKU(sku) {
  return SUPPLIER_MAP[sku] || null;
}
