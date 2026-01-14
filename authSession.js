// authSession.js
(function () {
  const token = localStorage.getItem("nexus_token");
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);

    // Token expirado
    if (payload.exp && payload.exp < now) {
      localStorage.clear();
      window.location.replace("login.html");
    }
  } catch {
    localStorage.clear();
    window.location.replace("login.html");
  }
})();