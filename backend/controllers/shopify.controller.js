import fetch from "node-fetch";

const SHOP = process.env.SHOPIFY_SHOP_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";

if (!SHOP || !TOKEN) {
  console.warn("[SHOPIFY] Variáveis de ambiente não definidas");
}

async function shopifyGraphQL(query, variables = {}) {
  const url = `https://${SHOP}/admin/api/${VERSION}/graphql.json`;

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Shopify GraphQL erro ${r.status}: ${text}`);
  }

  const json = await r.json();
  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

export const shopifyController = {
  // GET /api/shopify/products?limit=20
  products: async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 20), 50);

      const query = `
        query Products($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                vendor
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
                      price
                      inventoryQuantity
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const data = await shopifyGraphQL(query, { first: limit });

      const products = data.products.edges.map(e => {
        const p = e.node;
        const image = p.images.edges[0]?.node?.url || null;

        return {
          id: p.id,
          title: p.title,
          vendor: p.vendor,
          image,
          variants: p.variants.edges.map(v => ({
            id: v.node.id,
            sku: v.node.sku,
            price: Number(v.node.price),
            inventoryQuantity: v.node.inventoryQuantity,
          })),
        };
      });

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