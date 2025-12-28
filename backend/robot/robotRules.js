export function evaluateOrder(order) {
  if (order.supplier.price > 2000) {
    return { allowed: false, reason: "PRICE_TOO_HIGH" };
  }

  if (order.supplier.rating < 4.2) {
    return { allowed: false, reason: "LOW_SUPPLIER_SCORE" };
  }

  return { allowed: true };
}
