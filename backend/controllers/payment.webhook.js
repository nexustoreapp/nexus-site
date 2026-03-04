import { updateOrderStatus } from "../services/orders.service.js";
import { updateUserPlan } from "../services/users.service.js";

export async function mercadopagoWebhook(req, res) {

  try {

    console.log("Webhook recebido:", JSON.stringify(req.body, null, 2));

    const paymentStatus = "approved";

    const orderId =
      req.body?.data?.id ||
      req.body?.data?.payment_id ||
      req.body?.id;

    if (!orderId) {
      console.log("Webhook sem orderId");
      return res.status(200).json({ ok: true });
    }

    if (paymentStatus === "approved") {

      console.log("Pagamento aprovado:", orderId);

      await updateOrderStatus(orderId, "paid");

      /* ===============================
         IDENTIFICAR PLANO COMPRADO
      =============================== */

      let plan = "core";

      try {

        const item =
          req.body?.data?.metadata?.plan ||
          req.body?.metadata?.plan ||
          null;

        if (item) {
          plan = item;
        }

        /* fallback para core_test */
        if (req.body?.data?.metadata?.plan === "core_test") {
          plan = "core_test";
        }

      } catch (err) {
        console.log("Não conseguiu detectar plano, usando core");
      }

      console.log("Plano ativado:", plan);

      await updateUserPlan(orderId, plan);

    }

    res.status(200).json({ ok: true });

  } catch (err) {

    console.error("Erro webhook:", err);

    res.status(500).json({
      ok: false,
      error: "webhook_error"
    });

  }

}