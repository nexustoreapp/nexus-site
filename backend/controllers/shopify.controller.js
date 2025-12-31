import fetch from "node-fetch";

const SHOP = process.env.SHOPIFY_SHOP_DOMAIN; // uubejc-kq.myshopify.com
const TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

export const shopifyController = {
  // GET /api/shopify/products?limit=20
  products: async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 20), 50);

      const query = `
        query GetProducts($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                handle
                vendor
                availableForSale
                images(first: 1) {
                  edges {
                    node { url }
                  }
                }
                variants(first: 1) {
                  edges {
                    node {
                      sku
                      availableForSale
                      price {
                        amount
                        currencyCode
                      }
                    }
                  }
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
        body: JSON.stringify({ query, variables: { first: limit } }),
      });

      const json = await r.json();

      if (json.errors) {
        return res.status(400).json({ ok: false, errors: json.errors });
      }

      const products = json.data.products.edges.map(e => {
        const p = e.node;
        const v = p.variants.edges[0]?.node;

        return {
          handle: p.handle,
          title: p.title,
          vendor: p.vendor,
          available: p.availableForSale,
          image: p.images.edges[0]?.node?.url || null,
          sku: v?.sku || null,
          price: v ? Number(v.price.amount) : null,
          currency: v?.price.currencyCode || null,
        };
      });

      return res.json({ ok: true, products });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  },
};