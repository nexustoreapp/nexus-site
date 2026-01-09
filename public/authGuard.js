function getToken() {
  try {
    return localStorage.getItem("nexus_token");
  } catch {
    return null;
  }
}

function requireAuth(action) {
  if (getToken()) return true;

  try {
    localStorage.setItem("nexus_intent", action);
  } catch {}

  window.location.href = "assinatura.html";
  return false;
}

function requirePlan(requiredPlan) {
  const plan = localStorage.getItem("nexus_plan") || "free";
  const order = ["free", "core", "hyper", "omega"];

  return order.indexOf(plan) >= order.indexOf(requiredPlan);
}

function consumeIntent() {
  try {
    const i = localStorage.getItem("nexus_intent");
    localStorage.removeItem("nexus_intent");
    return i;
  } catch {
    return null;
  }
}