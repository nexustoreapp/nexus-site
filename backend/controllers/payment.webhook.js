import { updateOrderStatus } from "../services/orders.service.js";
import { updateUserPlan } from "../services/users.service.js";

function extractPlanFromItem(itemId) {

  if (!itemId) return "free";

  if (itemId.includes("core_test")) return "core_test";
  if (itemId.includes("core")) return "core";
  if (itemId.includes("hyper")) return "hyper";
  if (itemId.includes("omega")) return "omega";

  return "free";
}

export async function mercadopagoWebhook(req, res) {

  try {

    console.log("Webhook recebido:", req.body);

    const paymentStatus = "approved";

    const orderId = req.body?.data?.id;

    const itemId = req.body?.data?.item_id;

    if (!orderId) {
      console.log("Webhook sem orderId");
      return res.status(200).json({ ok: true });
    }

    if (paymentStatus === "approved") {

      await updateOrderStatus(orderId, "paid");

      /* ===============================
         DESCOBRIR QUAL PLANO FOI COMPRADO
      =============================== */

      const plan = extractPlanFromItem(itemId);

      await updateUserPlan(orderId, plan);

      console.log("Plano ativado:", plan);

    }

    res.status(200).json({ ok: true });

  } catch (err) {

    console.error("Erro webhook:", err);

    res.status(500).json({ error: "webhook_error" });

  }

}