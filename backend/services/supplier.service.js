import { selectBestSupplier } from "../suppliers/suppliers.selector.js";
import { placeSupplierOrder } from "../suppliers/suppliers.mock.js";

export async function handleSupplierOrder({ product, orderId, userPlan }) {
  const supplier = selectBestSupplier(product, userPlan);

  const response = await placeSupplierOrder({
    supplier,
    product,
    orderId
  });

  return {
    supplierId: supplier.id,
    trackingCode: response.trackingCode,
    etaDays: response.estimatedDeliveryDays
  };
}