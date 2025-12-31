import fetch from "node-fetch";

const SHOP = process.env.SHOPIFY_SHOP_DOMAIN;
const TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

export const shopifyController = {
  // GET /api/shopify/product?handle=...
  products: async (req, res) => {
    try {
      const handle = String(req.query.handle || "").trim();
      if (!handle) {
        return res.status(400).json({ ok: false, error: "MISSING_HANDLE" });
      }

      const query = `
        query ProductByHandle($handle: String!) {
          productByHandle(handle: $handle) {
            id
            title
            vendor
            handle
            availableForSale
            images(first: 1) { edges { node { url } } }
            variants(first: 5) {
              edges {
                node {
                  id
                  sku
                  availableForSale
                  price { amount currencyCode }
                }
              }
            }
          }
        }
      `;

      const r = await fetch(`https://${SHOP}/api/2024-10/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": TOKEN,
        },
        body: JSON.stringify({ query, variables: { handle } }),
      });

      const json = await r.json();

      return res.json({
        ok: true,
        shopDomainUsed: SHOP,
        handle,
        raw: json
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  },
};