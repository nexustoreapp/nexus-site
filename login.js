// login.js

function getRecaptchaToken(action) {
  return new Promise((resolve) => {
    if (!window.grecaptcha) {
      resolve(null);
      return;
    }

    grecaptcha.ready(() => {
      grecaptcha.execute(RECAPTCHA_SITE_KEY, { action }).then(resolve);
    });
  });
}

/* =========================
LOGIN
========================= */

async function loginUser(e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const recaptchaToken = await getRecaptchaToken("login");

  const res = await fetch(`${NEXUS_API}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password,
      recaptchaToken
    })
  });

  const data = await res.json();

  if (!data.ok) {
    showMessage(data.error || "Erro ao fazer login");
    return;
  }

  localStorage.setItem("nexus_token", data.token);

  window.location.href = "minha-conta.html";
}

/* =========================
REGISTER
========================= */

async function registerUser(e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const cpf = document.getElementById("cpf").value.trim();
  const password = document.getElementById("password").value.trim();

  const recaptchaToken = await getRecaptchaToken("register");

  const res = await fetch(`${NEXUS_API}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      email,
      cpf,
      password,
      recaptchaToken
    })
  });

  const data = await res.json();

  if (!data.ok) {
    showMessage(data.error || "Erro ao cadastrar");
    return;
  }

  alert("Cadastro realizado com sucesso!");
  window.location.href = "login.html";
}

/* =========================
UI
========================= */

function showMessage(msg) {
  const el = document.getElementById("msg");
  if (el) el.innerText = msg;
}

/* =========================
BOOT
========================= */

document.addEventListener("DOMContentLoaded", () => {

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", loginUser);
  }

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", registerUser);
  }

});