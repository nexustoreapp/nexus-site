// backend/robot/robotRules.js

// Configurações centrais
export const RULES = {
  maxPriceBRL: 2000,
  minSupplierScore: 4.2,
  allowedCountries: ["BR"],
  blockedSuppliers: [],
  autoPauseAfterFails: 3
};

// Avalia se o pedido pode seguir
export function evaluateOrder({ order, supplier }) {
  if (!supplier) {
    return deny("NO_SUPPLIER");
  }

  if (supplier.priceBRL > RULES.maxPriceBRL) {
    return deny("PRICE_TOO_HIGH");
  }

  if (supplier.score && supplier.score < RULES.minSupplierScore) {
    return deny("LOW_SUPPLIER_SCORE");
  }

  if (
    RULES.allowedCountries.length &&
    !RULES.allowedCountries.includes(order.customer.country)
  ) {
    return deny("COUNTRY_NOT_ALLOWED");
  }

  if (RULES.blockedSuppliers.includes(supplier.name)) {
    return deny("SUPPLIER_BLOCKED");
  }

  return allow();
}

function allow() {
  return { allowed: true };
}

function deny(reason) {
  return { allowed: false, reason };
}
