// login.js
const API = window.NEXUS_API;

let mode = "login"; // login | register

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("auth-form");
  const title = document.getElementById("form-title");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const cpf = document.getElementById("cpf");
  const button = document.getElementById("submit-btn");
  const message = document.getElementById("auth-message");
  const toggle = document.getElementById("toggle-mode");

  toggle.onclick = () => {
    if (mode === "login") {
      mode = "register";
      title.innerText = "Criar conta";
      button.innerText = "Cadastrar";
      toggle.innerText = "Já tenho conta";
    } else {
      mode = "login";
      title.innerText = "Entrar";
      button.innerText = "Entrar";
      toggle.innerText = "Criar conta";
    }
    message.innerText = "";
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    message.innerText = "";
    button.disabled = true;

    try {
      /* ======================
         LOGIN
      ====================== */
      if (mode === "login") {
        const r = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.value.trim(),
            password: password.value
          })
        });

        const d = await r.json();
        if (!d.ok) throw new Error(d.error);

        localStorage.setItem("nexus_token", d.token);
        location.href = "dashboard.html";
      }

      /* ======================
         REGISTRO (SEM OTP)
      ====================== */
      if (mode === "register") {
        const r = await fetch(`${API}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.value.trim(),
            password: password.value,
            cpf: cpf.value
          })
        });

        const d = await r.json();
        if (!d.ok) throw new Error(d.error);

        mode = "login";
        title.innerText = "Entrar";
        button.innerText = "Entrar";
        toggle.innerText = "Criar conta";
        message.innerText = "Conta criada com sucesso. Faça login.";
      }

    } catch (err) {
      message.innerText = err.message || "Erro inesperado";
    } finally {
      button.disabled = false;
    }
  };
});