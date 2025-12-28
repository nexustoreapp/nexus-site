// backend/robot/priceEngine.js

// Margens por plano
export const PLAN_MULTIPLIERS = {
  free: 1.12,   // +12%
  core: 1.08,   // +8%
  hype: 1.04,   // +4%
  omega: 1.00   // sem margem
};

// Calcula preço final
export function calculatePrice({ basePriceBRL, plan }) {
  const multiplier = PLAN_MULTIPLIERS[plan] || PLAN_MULTIPLIERS.free;
  const final = basePriceBRL * multiplier;

  // arredonda para 2 casas
  return Math.round(final * 100) / 100;
}
