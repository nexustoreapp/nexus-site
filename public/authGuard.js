// authGuard.js

const PLAN_ORDER = ["free", "core", "hyper", "omega"];

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