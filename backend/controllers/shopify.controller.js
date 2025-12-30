import fetch from "node-fetch";

const SHOP = process.env.SHOPIFY_SHOP_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";

if (!SHOP || !TOKEN) {
  console.warn("[SHOPIFY] Variáveis de ambiente não definidas");
}

export const shopifyController = {
  // GET /api/shopify/products?limit=20
  products: async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 20), 50);

      const url = `https://${SHOP}/admin/api/${VERSION}/products.json?limit=${limit}`;

      const r = await fetch(url, {
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json",
        },
      });

      if (!r.ok) {
        const text = await r.text();
        throw new Error(`Shopify REST erro ${r.status}: ${text}`);
      }

      const json = await r.json();

      const products = (json.products || []).map(p => ({
        id: p.id,
        title: p.title,
        vendor: p.vendor,
        image: p.image?.src || null,
        variants: (p.variants || []).map(v => ({
          id: v.id,
          sku: v.sku,
          price: Number(v.price),
          inventory_quantity: v.inventory_quantity,
        })),
      }));

      return res.json({ ok: true, products });
    } catch (err) {
      console.error("[SHOPIFY] erro:", err.message);
      return res.status(500).json({
        ok: false,
        error: "SHOPIFY_ERROR",
        message: err.message,
      });
    }
  },
};