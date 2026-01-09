const API = window.NEXUS_API;

let mode = "login";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("auth-form");
  const title = document.getElementById("form-title");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const cpf = document.getElementById("cpf");
  const button = document.getElementById("submit-btn");
  const message = document.getElementById("auth-message");
  const toggle = document.getElementById("toggle-mode");

  // CPF: só números
  cpf.addEventListener("input", () => {
    cpf.value = cpf.value.replace(/\D/g, "");
  });

  toggle.onclick = () => {
    if (mode === "login") {
      mode = "register";
      title.innerText = "Criar conta";
      button.innerText = "Cadastrar";
      toggle.innerText = "Já tenho conta";
      cpf.style.display = "block";
    } else {
      mode = "login";
      title.innerText = "Entrar";
      button.innerText = "Entrar";
      toggle.innerText = "Criar conta";
      cpf.style.display = "none";
    }
    message.innerText = "";
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    message.innerText = "";
    button.disabled = true;

    try {
      const captcha = grecaptcha.getResponse();
      if (!captcha) {
        throw new Error("Confirme o CAPTCHA.");
      }

      if (mode === "register") {
        if (password.value.length < 8) {
          throw new Error("Senha fraca. Use no mínimo 8 caracteres.");
        }

        const r = await fetch(`${API}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.value,
            password: password.value,
            cpf: cpf.value,
            captcha
          })
        });

        const d = await r.json();
        if (!d.ok) throw new Error(d.error);

        message.innerText = "Conta criada. Verifique o OTP no backend (temporário).";
      }

      if (mode === "login") {
        const r = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.value,
            password: password.value
          })
        });

        const d = await r.json();
        if (!d.ok) throw new Error(d.error);

        localStorage.setItem("nexus_token", d.token);
        location.href = "dashboard.html";
      }

    } catch (err) {
      message.innerText = err.message || "Erro inesperado";
      grecaptcha.reset();
    } finally {
      button.disabled = false;
    }
  };
});