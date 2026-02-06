// backend/services/order.service.js
import { ORDER_STATUS } from "../utils/orderStatus.js";

const orders = []; // enquanto não temos DB

export function createOrder({ userEmail, productId, paymentId }) {
  const order = {
    id: "ord_" + Date.now(),
    userEmail,
    productId,
    paymentId,
    status: ORDER_STATUS.CREATED,
    createdAt: new Date().toISOString(),
    history: [
      {
        status: ORDER_STATUS.CREATED,
        at: new Date().toISOString()
      }
    ]
  };

  orders.push(order);
  return order;
}

export function updateOrderStatus(orderId, newStatus) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return null;

  order.status = newStatus;
  order.history.push({
    status: newStatus,
    at: new Date().toISOString()
  });

  return order;
}

export function getOrdersByUser(email) {
  return orders.filter(o => o.userEmail === email);
}

export function getOrderById(orderId) {
  return orders.find(o => o.id === orderId);
}