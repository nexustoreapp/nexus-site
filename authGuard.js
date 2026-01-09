// authGuard.js
// Proteção básica de páginas HTML estáticas usando token JWT

(function () {
  const TOKEN_KEY = "nexus_token";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("nexus_user");
  }

  function redirectToLogin() {
    if (!window.location.pathname.endsWith("login.html")) {
      window.location.href = "login.html";
    }
  }

  function isProtectedPage() {
    const protectedPages = [
      "dashboard.html",
      "decisions.html",
      "produto.html",
      "buscar.html",
      "assinatura.html",
      "chat.html"
    ];

    return protectedPages.some(page =>
      window.location.pathname.endsWith(page)
    );
  }

  function guard() {
    if (!isProtectedPage()) return;

    const token = getToken();

    if (!token) {
      clearSession();
      redirectToLogin();
    }
  }

  document.addEventListener("DOMContentLoaded", guard);
})();