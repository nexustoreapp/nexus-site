// backend/services/orders.service.js

import ordersStore from "../data/orders.store.js";
import { ORDER_STATUS } from "../orders/orders.status.js";

export function markOrderAsPaid(orderId) {
  const order = ordersStore.find(o => o.id === orderId);

  if (!order) {
    return null;
  }

  order.status = ORDER_STATUS.PAGO;
  order.updatedAt = new Date().toISOString();

  return order;
}