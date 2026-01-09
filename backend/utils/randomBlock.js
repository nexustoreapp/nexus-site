// backend/utils/randomBlock.js

const RANDOM_BLOCK_RATE = {
  free: 70,
  core: 45,
  hyper: 25,
  omega: 0
};

export function isBlockedRandomly(productId, plan) {
  const rate = RANDOM_BLOCK_RATE[plan] ?? 100;
  if (rate === 0) return false;

  const today = new Date().toISOString().slice(0, 10);
  const seed = `${productId}:${plan}:${today}`;

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash) % 100 < rate;
}