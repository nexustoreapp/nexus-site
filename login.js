const API = window.NEXUS_API;

let mode = "login";

const form = document.getElementById("auth-form");
const email = document.getElementById("email");
const password = document.getElementById("password");
const cpf = document.getElementById("cpf");
const otp = document.getElementById("otp");
const message = document.getElementById("message");
const button = document.getElementById("submit-btn");
const toggle = document.getElementById("toggle");
const captchaBox = document.getElementById("captcha-box");
const passwordHint = document.getElementById("password-hint");

function onlyNumbers(v){ return v.replace(/\D/g,""); }

cpf.addEventListener("input", e => {
  e.target.value = onlyNumbers(e.target.value);
});

function isStrongPassword(p){
  return (
    p.length >= 8 &&
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /\d/.test(p) &&
    /[^A-Za-z0-9]/.test(p)
  );
}

async function post(url, body){
  const r = await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  });
  return r.json();
}

toggle.onclick = () => {
  message.innerText = "";
  if (mode === "login") {
    mode = "register";
    document.getElementById("title").innerText = "Criar conta";
    document.getElementById("subtitle").innerText = "Crie sua conta Nexus";
    toggle.innerText = "Já tenho conta";
    cpf.classList.remove("hidden");
    captchaBox.classList.remove("hidden");
    passwordHint.classList.remove("hidden");
    button.innerText = "Cadastrar";
  } else {
    mode = "login";
    document.getElementById("title").innerText = "Entrar";
    document.getElementById("subtitle").innerText = "Acesse sua conta Nexus";
    toggle.innerText = "Criar conta";
    cpf.classList.add("hidden");
    captchaBox.classList.add("hidden");
    passwordHint.classList.add("hidden");
    button.innerText = "Entrar";
  }
};

form.onsubmit = async (e) => {
  e.preventDefault();
  button.disabled = true;
  message.innerText = "";

  try {
    if (mode === "register") {
      if (!isStrongPassword(password.value)) {
        throw new Error("Senha fraca");
      }

      const captcha = grecaptcha.getResponse();
      if (!captcha) throw new Error("Confirme o CAPTCHA");

      const d = await post(`${API}/auth/register`, {
        email: email.value.trim(),
        password: password.value,
        cpf: cpf.value,
        captcha
      });

      if (!d.ok) throw new Error("Erro ao cadastrar");
      message.innerText = "Conta criada. Faça login.";
      toggle.click();
      return;
    }

    if (mode === "login") {
      const d = await post(`${API}/auth/login`, {
        email: email.value.trim(),
        password: password.value
      });

      if (!d.ok) throw new Error("Credenciais inválidas");

      localStorage.setItem("nexus_token", d.token);
      window.location.href = "index.html";
    }

  } catch (err) {
    message.innerText = err.message;
  } finally {
    button.disabled = false;
  }
};