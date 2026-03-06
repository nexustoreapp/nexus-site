// backend/controllers/checkout.controller.js

import { isBlockedRandomly } from "../utils/randomBlock.js";
import { createOrder } from "../services/orders.service.js";

const PLAN_ORDER = ["free", "core", "hyper", "omega"];

/*
  Regras de produto (fallback)
*/
const PRODUCT_RULES = {
  "produto-001": { requiredPlan: "core" },
  "produto-002": { requiredPlan: "hyper" },
  "produto-003": { requiredPlan: "omega" }
};

function planRank(p) {
  return PLAN_ORDER.indexOf(p);
}

export async function prepareCheckout(req, res) {
  try {

    const user = req.user;
    const { productId, sku, price } = req.body || {};

    const productSku = productId || sku;

    if (!productSku) {
      return res.status(400).json({ ok:false, error:"PRODUCT_REQUIRED" });
    }

    const rule = PRODUCT_RULES[productSku] || { requiredPlan:"free" };

    const userPlan = user.plan || "free";

    /* ===============================
       BLOQUEIO ALEATÓRIO
    =============================== */

    if (isBlockedRandomly(productSku, userPlan, user.email)) {
      return res.status(403).json({
        ok:false,
        error:"RANDOM_BLOCK",
        message:"Produto temporariamente bloqueado para seu plano hoje."
      });
    }

    /* ===============================
       VALIDAÇÃO DE PLANO
    =============================== */

    if (
      planRank(userPlan) <
      planRank(rule.requiredPlan)
    ) {
      return res.status(403).json({
        ok:false,
        error:"PLAN_REQUIRED",
        requiredPlan: rule.requiredPlan
      });
    }

    /* ===============================
       CRIAR PEDIDO
    =============================== */

    const order = await createOrder({
      userEmail: user.email,

      items: [
        {
          sku: productSku,
          title: productSku,
          price: Number(price || 0.01),
          qty: 1
        }
      ],

      shipping: {
        price: 0,
        carrier: "supplier_pending",
        etaDays: null
      },

      totals: {
        subtotal: Number(price || 0.01),
        shipping: 0,
        total: Number(price || 0.01)
      },

      metadata: {
        productSku
      }
    });

    return res.json({
      ok:true,
      orderId: order.id,
      productId: productSku
    });

  } catch (err) {

    console.error("[CHECKOUT PREPARE]", err);

    return res.status(500).json({
      ok:false,
      error:"SERVER_ERROR"
    });

  }
}