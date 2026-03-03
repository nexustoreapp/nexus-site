import fetch from "node-fetch";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

export async function createPayment(req, res) {
  try {

    const { items, amountCents, currency } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.json({
        ok: false,
        error: "ITEMS_REQUIRED"
      });
    }

    const amount = amountCents / 100;

    const body = {
      items: items.map(i => ({
        title: i.title,
        quantity: i.quantity || 1,
        unit_price: Number(i.unit_price),
        currency_id: currency || "BRL"
      })),

      payer: {
        email: req.user?.email || "comprador@test.com"
      },

      payment_methods: {
        excluded_payment_types: [],
        installments: 12
      },

      back_urls: {
        success: process.env.FRONTEND_URL + "/payment-success.html",
        failure: process.env.FRONTEND_URL + "/payment-failure.html",
        pending: process.env.FRONTEND_URL + "/payment-pending.html"
      },

      auto_return: "approved",

      notification_url:
        process.env.BACKEND_URL +
        "/api/v1/payment/webhook/mercadopago"
    };



/* =====================================================
INICIO_PLANO_TESTE
Permite pagamento de valor mínimo (0.01) para teste
===================================================== */

    if (amount < 0.01) {
      return res.json({
        ok: false,
        error: "VALOR_INVALIDO_TESTE"
      });
    }

/* =====================================================
FIM_PLANO_TESTE
===================================================== */



    const mp = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    const data = await mp.json();

    if (!data || !data.id) {
      console.error("Erro MP:", data);

      return res.json({
        ok: false,
        error: "MP_CREATE_ERROR",
        detail: data
      });
    }

    return res.json({
      ok: true,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
      preference_id: data.id
    });

  } catch (err) {

    console.error("Erro createPayment:", err);

    return res.json({
      ok: false,
      error: "SERVER_ERROR"
    });
  }
}