import ordersStore from "../data/orders.store.js";

export async function updateOrderStatus(orderId, newStatus) {
  const order = ordersStore.find(o => o.id === orderId);

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  order.status = newStatus;
  order.updatedAt = new Date().toISOString();

  return order;
}