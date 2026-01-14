/* ===============================
   CONFIG GLOBAL — NEXUS
================================ */

// Base da API (Render) — SEMPRE com /api
window.NEXUS_API = "https://nexus-site-oufm.onrender.com/api";

/* ===============================
   FETCH PADRÃO (ANTI-SCRAPING)
================================ */
window.nexusFetch = async function (url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    "X-Nexus-Client": "web"
  };

  return fetch(url, options);
};

/* ===============================
   PLANO ATUAL (FRONT)
================================ */
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

/* ===============================
   TOKEN
================================ */
window.getNexusToken = function () {
  try {
    return localStorage.getItem("nexus_token");
  } catch {
    return null;
  }
};

/* ===============================
   AUTH GUARD SIMPLES
================================ */
window.requireAuth = function (intent) {
  const token = window.getNexusToken();
  if (!token) {
    if (intent) {
      localStorage.setItem("nexus_intent", intent);
    }
    window.location.href = "login.html";
    return false;
  }
  return true;
};