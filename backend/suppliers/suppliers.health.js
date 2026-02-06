export function supplierHealthCheck(supplier) {
  if (!supplier.active) return false;

  if (supplier.risk > 0.3) return false;

  return true;
}