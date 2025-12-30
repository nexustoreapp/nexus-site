import fetch from "node-fetch";

const SHOP = process.env.SHOPIFY_SHOP_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || "2024-10";

export const shopifyController = {
  products: async (req, res) => {
    try {
      const url = `https://${SHOP}/admin/api/${VERSION}/shop.json`;

      const r = await fetch(url, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json"
        }
      });

      const text = await r.text();

      return res.status(r.status).send({
        status: r.status,
        response: text
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: err.message
      });
    }
  }
};