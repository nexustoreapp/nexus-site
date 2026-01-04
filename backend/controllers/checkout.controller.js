// backend/controllers/checkout.controller.js
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

function loadAllProducts() {
  const dir = path.resolve("backend/data/catalog");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  let all = [];
  for (const f of files) {
    const list = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
    if (Array.isArray(list)) all = all.concat(list);
  }
  return all;
}

function findProductBySku(sku) {
  const all = loadAllProducts();
  return all.find(p => p.sku === sku) || null;
}

export const checkoutController = {
  // POST /api/checkout/create
  // body: { sku, quantity }
  create: async (req, res) => {
    try {
      if (!MP_ACCESS_TOKEN) {
        return res.status(500).json({ ok: false, error: "MP_ACCESS_TOKEN_MISSING" });
      }

      const { sku, quantity } = req.body || {};
      const qty = Math.max(Number(quantity || 1), 1);

      const product = findProductBySku(String(sku || ""));
      if (!product) return res.status(404).json({ ok: false, error: "SKU_NOT_FOUND" });

      // CPF vem do JWT (amarrado ao checkout)
      const cpf = req.user?.cpf;
      if (!cpf) return res.status(400).json({ ok: false, error: "CPF_REQUIRED" });

      const unitPrice = Number(product.nexusPriceBRL || product.price);
      if (!unitPrice || unitPrice <= 0) return res.status(400).json({ ok: false, error: "INVALID_PRICE" });

      const preferenceBody = {
        items: [
          {
            title: product.title,
            quantity: qty,
            unit_price: unitPrice,
            currency_id: "BRL"
          }
        ],
        payer: {
          email: req.user?.email,
          identification: {
            type: "CPF",
            number: cpf
          }
        },
        back_urls: {
          success: process.env.MP_SUCCESS_URL,
          failure: process.env.MP_FAILURE_URL,
          pending: process.env.MP_PENDING_URL
        },
        notification_url: process.env.MP_WEBHOOK_URL,
        auto_return: "approved",
        external_reference: `nexus:${req.user?.id}:${sku}:${Date.now()}`
      };

      // Create Preference (Checkout Pro) 5
      const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(preferenceBody)
      });

      const data = await r.json();
      if (!r.ok) {
        return res.status(500).json({ ok: false, error: "MP_ERROR", details: data });
      }

      return res.json({
        ok: true,
        preferenceId: data.id,
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point
      });

    } catch (err) {
      console.error("[CHECKOUT ERROR]", err);
      return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  },

  // POST /api/checkout/webhook  (depois a gente valida assinatura) 6
  webhook: async (req, res) => {
    // Por enquanto só confirma recebimento
    return res.status(200).json({ ok: true });
  }
};