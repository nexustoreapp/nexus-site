// authGuard.js

const PLAN_ORDER = ["free", "core", "hyper", "omega"];

const RANDOM_BLOCK_RATE = {
  free: 70,
  core: 45,
  hyper: 25,
  omega: 0
};

function getToken() {
  try {
    return localStorage.getItem("nexus_token");
  } catch {
    return null;
  }
}

function getPlan() {
  try {
    return localStorage.getItem("nexus_plan") || "free";
  } catch {
    return "free";
  }
}

/* ===============================
   BLOQUEIO ALEATÓRIO DIÁRIO
================================ */
function isBlockedRandomly(productId) {
  const plan = getPlan();
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

/* ===============================
   PLANO FIXO (MINÍMO)
================================ */
function hasRequiredPlan(requiredPlan) {
  return PLAN_ORDER.indexOf(getPlan()) >= PLAN_ORDER.indexOf(requiredPlan);
}

function requireAuth(action) {
  if (getToken()) return true;

  try {
    localStorage.setItem("nexus_intent", action);
  } catch {}

  window.location.href = "assinatura.html";
  return false;
}