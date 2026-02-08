// backend/services/orders.service.js

import ordersStore from "../data/orders.store.js";
import { ORDER_STATUS } from "../orders/orders.status.js";

/**
 * Atualiza o status de um pedido
 */
export function updateOrderStatus(orderId, status) {
  const order = ordersStore.find(o => o.id === orderId);

  if (!order) {
    return null;
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();

  return order;
}

/**
 * Atalho comum para pagamento aprovado
 */
export function markOrderAsPaid(orderId) {
  return updateOrderStatus(orderId, ORDER_STATUS.PAGO);
}