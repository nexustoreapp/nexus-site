// authGuard.js

function getToken() {
  return localStorage.getItem("nexus_token");
}

function requireAuth() {

  const token = getToken();

  if (!token) {
    window.location.href = "login.html";
    return;
  }

}

function logout() {
  localStorage.removeItem("nexus_token");
  window.location.href = "login.html";
}

export {
  requireAuth,
  logout
};