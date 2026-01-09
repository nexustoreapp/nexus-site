// backend/controllers/checkout.controller.js
import { isBlockedRandomly } from "../utils/randomBlock.js";

const PLAN_ORDER = ["free", "core", "hyper", "omega"];

/*
  Regras de produto (por enquanto fixo)
  Depois isso vem de banco
*/
const PRODUCT_RULES = {
  "produto-001": { requiredPlan: "core" },
  "produto-002": { requiredPlan: "hyper" },
  "produto-003": { requiredPlan: "omega" }
};

export function prepareCheckout(req, res) {
  try {
    const user = req.user;
    const { productId } = req.body || {};

    if (!productId) {
      return res.status(400).json({ ok:false, error:"PRODUCT_REQUIRED" });
    }

    const rule = PRODUCT_RULES[productId];
    if (!rule) {
      return res.status(404).json({ ok:false, error:"PRODUCT_NOT_FOUND" });
    }

    const userPlan = user.plan || "free";

    /* ===============================
       BLOQUEIO ALEATÓRIO
    =============================== */
    if (isBlockedRandomly(productId, userPlan)) {
      return res.status(403).json({
        ok:false,
        error:"RANDOM_BLOCK",
        message:"Produto temporariamente bloqueado para seu plano hoje."
      });
    }

    /* ===============================
       PLANO MÍNIMO
    =============================== */
    if (
      PLAN_ORDER.indexOf(userPlan) <
      PLAN_ORDER.indexOf(rule.requiredPlan)
    ) {
      return res.status(403).json({
        ok:false,
        error:"PLAN_REQUIRED",
        requiredPlan: rule.requiredPlan
      });
    }

    /* ===============================
       CHECKOUT LIBERADO
    =============================== */
    return res.json({
      ok:true,
      checkoutToken: `checkout_${Date.now()}`,
      productId
    });

  } catch (err) {
    console.error("[CHECKOUT PREPARE]", err);
    return res.status(500).json({ ok:false, error:"SERVER_ERROR" });
  }
}