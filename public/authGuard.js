function logoutAndRedirect() {
  localStorage.removeItem("nexus_token");
  localStorage.removeItem("nexus_plan");
  localStorage.removeItem("nexus_intent");
  window.location.href = "login.html";
}

function requireAuth(intent = null) {
  const token = localStorage.getItem("nexus_token");

  if (!token) {
    if (intent) localStorage.setItem("nexus_intent", intent);
    window.location.href = "login.html";
    return false;
  }

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    // exp em segundos → Date.now em ms
    if (payload.exp * 1000 < Date.now()) {
      logoutAndRedirect();
      return false;
    }

    return true;

  } catch (e) {
    logoutAndRedirect();
    return false;
  }
}