// backend/services/orders.service.js

import { decidirFornecedor } from "./fornecedorDecision.service.js";
import { ORDER_STATUS } from "../orders/orders.status.js";

// store em memória (MVP controlado)
const ordersStore = new Map();

/**
 * Cria pedido base
 */
export function createOrder({ orderId, items, userId }) {
  const order = {
    id: orderId,
    userId,
    items,
    status: ORDER_STATUS.CRIADO,
    fornecedor: null,
    history: [
      {
        status: ORDER_STATUS.CRIADO,
        at: new Date().toISOString()
      }
    ]
  };

  ordersStore.set(orderId, order);
  return order;
}

/**
 * Atualiza status do pedido
 */
export function updateOrderStatus(orderId, newStatus, extra = {}) {
  const order = ordersStore.get(orderId);
  if (!order) return null;

  order.status = newStatus;
  order.history.push({
    status: newStatus,
    at: new Date().toISOString(),
    ...extra
  });

  return order;
}

/**
 * Aplica decisão automática de fornecedor
 * chamado após pagamento confirmado
 */
export function applyFornecedorDecision(orderId) {
  const order = ordersStore.get(orderId);
  if (!order) return null;

  const decision = decidirFornecedor({
    productSnapshot: order.items
  });

  if (!decision.ok) {
    updateOrderStatus(orderId, ORDER_STATUS.FALHA_FORNECEDOR, {
      reason: decision.reason
    });
    return order;
  }

  order.fornecedor = decision.fornecedor;

  updateOrderStatus(orderId, ORDER_STATUS.ENVIADO_PARA_FORNECEDOR, {
    fornecedorId: decision.fornecedor.id
  });

  return order;
}

/**
 * Busca pedido
 */
export function getOrderById(orderId) {
  return ordersStore.get(orderId) || null;
}