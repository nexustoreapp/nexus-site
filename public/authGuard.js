// authGuard.js
function getToken() {
  try {
    return localStorage.getItem("nexus_token");
  } catch {
    return null;
  }
}

function requireAuth(action) {
  if (getToken()) return true;

  // guarda intenção do usuário
  try {
    localStorage.setItem("nexus_intent", action);
  } catch {}

  // redireciona para planos, NÃO para login
  window.location.href = "assinatura.html";
  return false;
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