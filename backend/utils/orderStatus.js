// backend/utils/orderStatus.js

export const ORDER_STATUS = {
  CREATED: "created",          // criado após pagamento confirmado
  PROCESSING: "processing",    // separação / fornecedor
  SHIPPED: "shipped",          // enviado
  DELIVERED: "delivered",      // entregue
  CANCELED: "canceled",        // cancelado
  REFUNDED: "refunded"         // reembolsado
};

export const ORDER_FLOW = [
  "created",
  "processing",
  "shipped",
  "delivered"
];