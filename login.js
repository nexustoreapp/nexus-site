// login.js
const API = window.NEXUS_API;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const cpf = document.getElementById("cpf");
  const button = document.getElementById("submit-btn");
  const message = document.getElementById("login-message");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    message.innerText = "";
    button.disabled = true;
    button.innerText = "Processando...";

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value,
          password: password.value,
          cpf: cpf.value
        })
      });

      const data = await res.json();

      if (!data.ok) {
        message.innerText = data.error || "Erro ao entrar";
        return;
      }

      localStorage.setItem("nexus_token", data.token);
      window.location.href = "dashboard.html";

    } catch (err) {
      message.innerText = "Erro de conexão";
    } finally {
      button.disabled = false;
      button.innerText = "Entrar";
    }
  });
});