import fetch from "node-fetch";

// TESTE SHOPIFY BÁSICO
export const shopifyController = {
  products: async (req, res) => {
    const url = `https://${process.env.SHOPIFY_SHOP_DOMAIN}/admin/api/2024-10/shop.json`;

    const r = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_TOKEN,
      },
    });

    const text = await r.text();
    return res.status(r.status).send(text);
  },
};