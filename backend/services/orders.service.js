// backend/services/orders.service.js

import { ORDER_STATUS } from "../orders/orders.status.js";
import crypto from "crypto";

/**
 * STORE EM MEMÓRIA (por enquanto)
 * No futuro: DB real ou provider
 */
const ordersStore = new Map();

/**
 * Cria um novo pedido
 * Pedido nasce como contrato imutável
 */
export function createOrder({
  userId,
  productSnapshot,
  totalAmount
}) {
  const orderId = crypto.randomUUID();

  const now = new Date().toISOString();

  const order = {
    orderId,
    userId,

    productSnapshot: {
      productId: productSnapshot.productId,
      name: productSnapshot.name,
      sku: productSnapshot.sku,
      supplier: productSnapshot.supplier,
      price: productSnapshot.price
    },

    totalAmount,

    status: ORDER_STATUS.CRIADO,

    events: [
      {
        type: "ORDER_CREATED",
        at: now
      }
    ],

    createdAt: now,
    updatedAt: now
  };

  ordersStore.set(orderId, order);
  return order;
}

/**
 * Busca pedido por ID
 */
export function getOrderById(orderId) {
  return ordersStore.get(orderId) || null;
}

/**
 * Atualiza status do pedido
 * Usado por pagamento, webhook e fornecedor
 */
export function updateOrderStatus(orderId, newStatus, eventType) {
  const order = ordersStore.get(orderId);
  if (!order) return null;

  // regra de proteção
  if (order.status === ORDER_STATUS.ENTREGUE) {
    return order;
  }

  const now = new Date().toISOString();

  order.status = newStatus;
  order.updatedAt = now;

  order.events.push({
    type: eventType,
    at: now
  });

  ordersStore.set(orderId, order);
  return order;
}

/**
 * Confirma pagamento (chamado pelo webhook)
 */
export function confirmPayment(orderId) {
  return updateOrderStatus(
    orderId,
    ORDER_STATUS.PAGO,
    "PAYMENT_CONFIRMED"
  );
}

/**
 * Envia pedido para fornecedor
 */
export function sendToSupplier(orderId) {
  return updateOrderStatus(
    orderId,
    ORDER_STATUS.ENVIADO_PARA_FORNECEDOR,
    "SENT_TO_SUPPLIER"
  );
}

/**
 * Fornecedor aceitou o pedido
 */
export function supplierAccepted(orderId) {
  return updateOrderStatus(
    orderId,
    ORDER_STATUS.ACEITO_PELO_FORNECEDOR,
    "SUPPLIER_ACCEPTED"
  );
}

/**
 * Pedido em trânsito
 */
export function markInTransit(orderId) {
  return updateOrderStatus(
    orderId,
    ORDER_STATUS.EM_TRANSITO,
    "ORDER_IN_TRANSIT"
  );
}

/**
 * Pedido entregue
 */
export function markDelivered(orderId) {
  return updateOrderStatus(
    orderId,
    ORDER_STATUS.ENTREGUE,
    "ORDER_DELIVERED"
  );
}

/**
 * Falha no fornecedor
 */
export function supplierFailed(orderId, reason = "UNKNOWN") {
  const order = ordersStore.get(orderId);
  if (!order) return null;

  const now = new Date().toISOString();

  order.status = ORDER_STATUS.FALHA_FORNECEDOR;
  order.updatedAt = now;

  order.events.push({
    type: "SUPPLIER_FAILED",
    reason,
    at: now
  });

  ordersStore.set(orderId, order);
  return order;
}