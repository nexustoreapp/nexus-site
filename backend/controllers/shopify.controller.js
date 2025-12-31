import fetch from "node-fetch";

const SHOP = process.env.SHOPIFY_SHOP_DOMAIN; // ex: uubejc-kq.myshopify.com
const TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

async function storefront(query, variables = {}) {
  const r = await fetch(`https://${SHOP}/api/2024-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await r.json();
  return json;
}

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
                  edges { node { url } }
                }
                variants(first: 1) {
                  edges {
                    node {
                      sku
                      availableForSale
                      price { amount currencyCode }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const json = await storefront(query, { first: limit });

      if (json.errors) return res.status(400).json({ ok: false, errors: json.errors });

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

  // GET /api/shopify/product?handle=...
  productByHandle: async (req, res) => {
    try {
      const handle = String(req.query.handle || "").trim();
      if (!handle) return res.status(400).json({ ok: false, error: "MISSING_HANDLE" });

      const query = `
        query ProductByHandle($handle: String!) {
          productByHandle(handle: $handle) {
            id
            title
            handle
            vendor
            availableForSale
            description
            images(first: 8) { edges { node { url } } }
            variants(first: 10) {
              edges {
                node {
                  sku
                  availableForSale
                  price { amount currencyCode }
                }
              }
            }
          }
        }
      `;

      const json = await storefront(query, { handle });

      if (json.errors) return res.status(400).json({ ok: false, errors: json.errors });

      const p = json.data.productByHandle;
      if (!p) return res.status(404).json({ ok: false, error: "PRODUCT_NOT_FOUND" });

      const images = p.images.edges.map(x => x.node.url);
      const variants = p.variants.edges.map(x => ({
        sku: x.node.sku,
        available: x.node.availableForSale,
        price: Number(x.node.price.amount),
        currency: x.node.price.currencyCode,
      }));

      // basePrice = menor preço das variantes
      const basePrice = variants.length ? Math.min(...variants.map(v => v.price)) : null;

      return res.json({
        ok: true,
        product: {
          title: p.title,
          handle: p.handle,
          vendor: p.vendor,
          available: p.availableForSale,
          description: p.description || "",
          images,
          variants,
          basePrice,
        }
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  },
};