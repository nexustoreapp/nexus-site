function isLogged() {
  return localStorage.getItem("token") !== null;
}

function updateTopbar() {

  const authArea = document.getElementById("auth-area");

  if (!authArea) return;

  if (isLogged()) {

    authArea.innerHTML = `
      <a href="/minha-conta.html">Minha conta</a>
      <button onclick="logout()" class="logout-btn">Sair</button>
    `;

  } else {

    authArea.innerHTML = `
      <a href="/login.html">Entrar</a>
    `;

  }

}

document.addEventListener("DOMContentLoaded", updateTopbar);