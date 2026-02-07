// backend/data/orders.store.js

/**
 * Store temporário de pedidos
 * (fase MVP – depois migra para banco de dados)
 */

const ordersStore = [];

/**
 * Cria um novo pedido
 */
export function createOrder(order) {
  ordersStore.push(order);
  return order;
}

/**
 * Busca pedido por ID
 */
export function findOrderById(orderId) {
  return ordersStore.find(o => o.id === orderId);
}

/**
 * Atualiza status do pedido
 */
export function updateOrder(orderId, data) {
  const order = findOrderById(orderId);
  if (!order) return null;

  Object.assign(order, data, {
    updatedAt: new Date().toISOString()
  });

  return order;
}

/**
 * Lista pedidos por usuário
 */
export function findOrdersByUser(userId) {
  return ordersStore.filter(o => o.userId === userId);
}

/**
 * Exporta o store bruto (uso interno)
 */
export default ordersStore;