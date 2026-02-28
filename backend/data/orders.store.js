// backend/data/orders.store.js
import { createOrder, getOrderById, listOrdersByUser, updateOrderStatus } from "../services/orders.service.js";

export async function storeCreateOrder(payload) {
  return createOrder(payload);
}

export async function storeGetOrderById(orderId) {
  return getOrderById(orderId);
}

export async function storeListOrdersByUser(userId) {
  return listOrdersByUser(userId);
}

export async function storeUpdateOrderStatus(orderId, nextStatus, extra = {}) {
  return updateOrderStatus(orderId, nextStatus, extra);
}

export default {
  storeCreateOrder,
  storeGetOrderById,
  storeListOrdersByUser,
  storeUpdateOrderStatus
};