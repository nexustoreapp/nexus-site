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

  cpf.addEventListener("input", () => {
    cpf.value = cpf.value.replace(/\D/g, "");
  });

  toggle.onclick = (e) => {
    e.preventDefault();
    message.innerText = "";

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
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    message.innerText = "";

    const captchaToken = grecaptcha.getResponse();
    if (!captchaToken) {
      message.innerText = "Confirme o CAPTCHA.";
      return;
    }

    button.disabled = true;
    button.innerText = "Processando...";

    try {
      if (mode === "register") {
        const r = await fetch(`${API}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.value.trim(),
            password: password.value,
            cpf: cpf.value,
            captcha: captchaToken
          })
        });

        const d = await r.json();
        if (!d.ok) throw new Error(d.error);

        message.innerText = "Conta criada. Faça login.";
        mode = "login";
        title.innerText = "Entrar";
        button.innerText = "Entrar";
        toggle.innerText = "Criar conta";
        cpf.style.display = "none";
        grecaptcha.reset();
        return;
      }

      if (mode === "login") {
        const r = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.value.trim(),
            password: password.value,
            captcha: captchaToken
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
      button.innerText = mode === "login" ? "Entrar" : "Cadastrar";
    }
  };
});