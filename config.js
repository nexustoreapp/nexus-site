// config.js
// Base da API (Render)
window.NEXUS_API = "https://nexus-site-oufm.onrender.com";

// Plano atual (se você quiser automatizar depois)
window.getNexusPlan = function () {
  try {
    return localStorage.getItem("nexus_plan") || "free";
  } catch {
    return "free";
  }
};

window.setNexusPlan = function (plan) {
  try {
    localStorage.setItem("nexus_plan", plan);
  } catch {}
};
