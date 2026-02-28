import MercadoPago from "mercadopago";

MercadoPago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

export default MercadoPago;
