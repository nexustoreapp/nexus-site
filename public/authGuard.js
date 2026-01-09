// authGuard.js

function getToken() {
  try {
    return localStorage.getItem("nexus_token");
  } catch {
    return null;
  }
}

function parseJwt(token) {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function getUserPlan() {
  const token = getToken();
  if (!token) return "free";
  const data = parseJwt(token);
  return data?.plan || "free";
}

function requireAuth(action) {
  if (getToken()) return true;

  try {
    localStorage.setItem("nexus_intent", action);
  } catch {}

  window.location.href = "assinatura.html";
  return false;
}

function hasRequiredPlan(requiredPlan) {
  const order = ["free", "core", "hyper", "omega"];
  return order.indexOf(getUserPlan()) >= order.indexOf(requiredPlan);
}