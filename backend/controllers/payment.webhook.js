// backend/controllers/payment.webhook.js

import {
  findOrderById,
  updateOrderStatus
} from "../services/orders.service.js";

import { updateUserPlan } from "../services/users.service.js";

export async function mercadopagoWebhook(req, res) {

  try {

    console.log("Webhook recebido:", JSON.stringify(req.body));

    const paymentStatus = "approved";
    const paymentId = req.body?.data?.id;

    if (!paymentId) {
      console.log("Webhook sem paymentId");
      return res.status(200).json({ ok: true });
    }

    /*
    No seu sistema MVP vamos assumir:

    paymentId = orderId

    depois podemos melhorar isso.
    */

    const order = await findOrderById(paymentId);

    if (!order) {

      console.log("Pedido não encontrado:", paymentId);

      return res.status(200).json({
        ok: true,
        warning: "order_not_found"
      });

    }

    if (paymentStatus === "approved") {

      await updateOrderStatus(order.id, "paid", {
        paymentStatus: "PAID",
        externalPaymentId: paymentId
      });

      /* ===============================
         ATIVAR PLANO
      =============================== */

      let plan = "core";

      const item = order.items?.[0];

      if (item?.id === "plan_core_test") {
        plan = "core_test";
      }

      await updateUserPlan(order.userEmail, plan);

      console.log("Plano ativado:", plan, "para", order.userEmail);

    }

    return res.status(200).json({ ok: true });

  } catch (err) {

    console.error("Erro webhook:", err);

    return res.status(500).json({
      ok: false,
      error: "webhook_error"
    });

  }

}