// layout.js
// Controla topbar automática e estado do usuário

async function loadTopbar() {
  const topbarContainer = document.getElementById("topbar-container");
  if (!topbarContainer) return;

  const res = await fetch("/topbar.html");
  const html = await res.text();

  topbarContainer.innerHTML = html;

  updateUserUI();
}

function updateUserUI() {
  const token = localStorage.getItem("token");

  const loginBtn = document.getElementById("nav-login");
  const logoutBtn = document.getElementById("nav-logout");

  if (!loginBtn || !logoutBtn) return;

  if (token) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", loadTopbar);