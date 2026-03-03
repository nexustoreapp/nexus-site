/**
 * out.js
 * Logout REAL (um clique):
 * - apaga token e dados locais
 * - volta pra home
 */
window.nexusLogout = function nexusLogout() {
  try {
    localStorage.removeItem("nexus_token");
    localStorage.removeItem("token");
    localStorage.removeItem("nexus_user");
  } catch {}
  window.location.href = "index.html";
};