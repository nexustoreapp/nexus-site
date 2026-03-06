/* =========================================
   NEXUS GLOBAL CONFIG
   NÃO ALTERAR AS LINHAS BASE DO SISTEMA
========================================= */

/* ================================
   CONFIG ORIGINAL (MANTIDA)
================================ */

window.NEXUS_API = "https://nexus-site-oufm.onrender.com/api/v1";

window.getToken = () => localStorage.getItem("nexus_token");

/* ================================
   HELPERS ADICIONADOS
   (não interferem no existente)
================================ */

window.getAuthHeaders = function () {
  const token = window.getToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`
  };
};

/* ================================
   PARSER DE TOKEN
================================ */

window.parseToken = function () {
  const token = window.getToken();

  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch {
    return null;
  }
};

/* ================================
   USER PLAN HELPER
================================ */

window.getUserPlan = function () {
  const user = window.parseToken();
  return (user?.plan || "free").toLowerCase();
};

/* ================================
   FORMATADOR BRL GLOBAL
================================ */

window.formatBRL = function (value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
};

/* ================================
   DEBUG OPCIONAL
================================ */

if (window.location.hostname === "localhost") {
  console.log("⚙️ Nexus Config carregado");
  console.log("API:", window.NEXUS_API);
}