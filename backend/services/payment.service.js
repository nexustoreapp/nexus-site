import MercadoPago from "../config/mercadopago.js";

export async function createPayment({ orderId, title, price, email }) {
  const preference = {
    items: [
      {
        title,
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(price)
      }
    ],
    payer: {
      email
    },
    back_urls: {
      success: `${process.env.FRONTEND_URL}/success`,
      failure: `${process.env.FRONTEND_URL}/failure`,
      pending: `${process.env.FRONTEND_URL}/pending`
    },
    notification_url: `${process.env.API_URL}/api/v1/payment/webhook`,
    external_reference: orderId,
    auto_return: "approved",
    payment_methods: {
      excluded_payment_types: [],
      installments: 12
    }
  };

  const response = await MercadoPago.preferences.create(preference);
  return response.body;
}