export async function placeSupplierOrder({ supplier, product, orderId }) {
  return {
    ok: true,
    supplierId: supplier.id,
    trackingCode: `TRK-${Date.now()}`,
    estimatedDeliveryDays: supplier.slaDays
  };
}