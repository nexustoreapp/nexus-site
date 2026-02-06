import { handleSupplierOrder } from "./supplier.service.js";

export async function createOrder({ user, product }) {
  const orderId = `ORD-${Date.now()}`;

  const supplierResult = await handleSupplierOrder({
    product,
    orderId,
    userPlan: user.plan
  });

  return {
    id: orderId,
    userId: user.id,
    productId: product.id,
    status: "PROCESSING",
    supplier: supplierResult,
    createdAt: Date.now()
  };
}