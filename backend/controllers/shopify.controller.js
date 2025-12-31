import fetch from "node-fetch";

const SHOP = process.env.SHOPIFY_SHOP_DOMAIN; // ex: ubejc-kq.myshopify.com
const TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

if (!SHOP || !TOKEN) {
  console.error("[SHOPIFY] SHOPIFY_SHOP_DOMAIN ou SHOPIFY_STOREFRONT_TOKEN ausentes");
}

export const shopifyController = {
  // GET /api/shopify/products?limit=10
  products: async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 10), 50);

      const query = `
        query GetProducts($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                vendor
                availableForSale
                images(first: 1) {
                  edges {
                    node {
                      url
                    }
                  }
                }
                variants(first: 10) {
                  edges {
                    node {
                      id
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
        body: JSON.stringify({
          query,
          variables: { first: limit },
        }),
      });

      const json = await r.json();

      if (json.errors) {
        return res.status(400).json({
          ok: false,
          errors: json.errors,
        });
      }

      const products = json.data.products.edges.map(e => {
        const p = e.node;
        return {
          id: p.id,
          title: p.title,
          vendor: p.vendor,
          available: p.availableForSale,
          image: p.images.edges[0]?.node?.url || null,
          variants: p.variants.edges.map(v => ({
            id: v.node.id,
            sku: v.node.sku,
            available: v.node.availableForSale,
            price: Number(v.node.price.amount),
            currency: v.node.price.currencyCode,
          })),
        };
      });

      return res.json({ ok: true, products });
    } catch (err) {
      console.error("[SHOPIFY] erro:", err.message);
      return res.status(500).json({
        ok: false,
        error: err.message,
      });
    }
  },
};