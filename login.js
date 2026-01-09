const API = window.NEXUS_API;

let mode = "login"; // login | register | otp

const form = document.getElementById("auth-form");
const title = document.getElementById("form-title");
const email = document.getElementById("email");
const password = document.getElementById("password");
const cpf = document.getElementById("cpf");
const otp = document.getElementById("otp");
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
};

form.onsubmit = async (e) => {
  e.preventDefault();
  message.innerText = "";
  button.disabled = true;

  try {
    if (mode === "login") {
      const r = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value,
          password: password.value,
          cpf: cpf.value
        })
      });

      const d = await r.json();
      if (!d.ok) throw new Error(d.error);

      localStorage.setItem("nexus_token", d.token);
      location.href = "dashboard.html";
    }

    if (mode === "register") {
      const r = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value,
          password: password.value,
          cpf: cpf.value
        })
      });

      const d = await r.json();
      if (!d.ok) throw new Error(d.error);

      mode = "otp";
      title.innerText = "Verificar código";
      otp.style.display = "block";
      button.innerText = "Confirmar";
      message.innerText = "Código enviado para o e-mail.";
    }

    if (mode === "otp") {
      const r = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value,
          otp: otp.value
        })
      });

      const d = await r.json();
      if (!d.ok) throw new Error(d.error);

      message.innerText = "Conta verificada. Faça login.";
      mode = "login";
      otp.style.display = "none";
      button.innerText = "Entrar";
      title.innerText = "Entrar";
    }

  } catch (err) {
    message.innerText = err.message || "Erro";
  } finally {
    button.disabled = false;
  }
};