import { getActiveSuppliers } from "./suppliers.registry.js";

export function selectBestSupplier(product, userPlan = "free") {
  const suppliers = getActiveSuppliers();

  if (suppliers.length === 0) {
    throw new Error("NO_SUPPLIER_AVAILABLE");
  }

  const scored = suppliers.map(s => {
    let score = 0;

    score -= s.risk * 100;
    score -= s.slaDays * 2;
    score += s.margin * 50;

    if (userPlan !== "free") score += 10;

    return { supplier: s, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored[0].supplier;
}