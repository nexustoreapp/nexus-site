/**
 * out.js
 * Logout REAL: limpa token e volta pro login.
 * (O layout.js chama window.NEXUS_logout() quando você clica em "Sair")
 */
window.NEXUS_logout = function(){
  try { localStorage.removeItem("nexus_token"); } catch {}
  try { localStorage.removeItem("nexus_user"); } catch {}
  window.location.href = "login.html";
};