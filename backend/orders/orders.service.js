import { ORDER_STATUS } from "./orders.status.js";
import { handleSupplierOrder } from "../services/supplier.service.js";

export async function createOrderService({ user, product }) {
  const order = {
    id: `ORD-${Date.now()}`,
    userId: user.id,
    product,
    status: ORDER_STATUS.CREATED,
    createdAt: Date.now(),
    history: []
  };

  order.history.push({
    status: ORDER_STATUS.CREATED,
    at: Date.now()
  });

  order.status = ORDER_STATUS.PAYMENT_PENDING;
  order.history.push({
    status: ORDER_STATUS.PAYMENT_PENDING,
    at: Date.now()
  });

  return order;
}

export async function processPaidOrder(order, user) {
  order.status = ORDER_STATUS.PAID;
  order.history.push({
    status: ORDER_STATUS.PAID,
    at: Date.now()
  });

  const supplierData = await handleSupplierOrder({
    product: order.product,
    orderId: order.id,
    userPlan: user.plan
  });

  order.supplier = supplierData;
  order.status = ORDER_STATUS.PROCESSING;

  order.history.push({
    status: ORDER_STATUS.PROCESSING,
    at: Date.now()
  });

  return order;
}