const API = window.NEXUS_API;

let mode = "login"; // login | register | otp-login | otp-register

const form = document.getElementById("auth-form");
const title = document.getElementById("title");
const subtitle = document.getElementById("subtitle");
const email = document.getElementById("email");
const password = document.getElementById("password");
const cpf = document.getElementById("cpf");
const otp = document.getElementById("otp");
const message = document.getElementById("message");
const button = document.getElementById("submit-btn");
const toggle = document.getElementById("toggle");
const captchaBox = document.getElementById("captcha-box");
const passwordHint = document.getElementById("password-hint");

function onlyDigits(v) {
  return v.replace(/\D/g, "");
}

cpf.addEventListener("input", () => {
  cpf.value = onlyDigits(cpf.value);
});

function strongPassword(p) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(p);
}

toggle.onclick = () => {
  if (mode === "login") {
    mode = "register";
    title.innerText = "Criar conta";
    subtitle.innerText = "Cadastre-se para continuar";
    button.innerText = "Criar conta";
    toggle.innerText = "Já tenho conta";
    cpf.classList.remove("hidden");
    captchaBox.classList.remove("hidden");
    passwordHint.classList.remove("hidden");
  } else {
    mode = "login";
    title.innerText = "Entrar";
    subtitle.innerText = "Acesse sua conta Nexus";
    button.innerText = "Entrar";
    toggle.innerText = "Criar conta";
    cpf.classList.add("hidden");
    captchaBox.classList.add("hidden");
    passwordHint.classList.add("hidden");
  }
  message.innerText = "";
};

form.onsubmit = async (e) => {
  e.preventDefault();
  message.innerText = "";
  button.disabled = true;

  try {
    /* ======================
       REGISTER
    ====================== */
    if (mode === "register") {
      if (!strongPassword(password.value)) {
        throw new Error("Senha fraca. Use maiúscula, minúscula, número e símbolo.");
      }

      const captcha = grecaptcha.getResponse();
      if (!captcha) throw new Error("Confirme o CAPTCHA.");

      const r = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value.trim(),
          password: password.value,
          cpf: cpf.value,
          captcha
        })
      });

      const d = await r.json();
      if (!d.ok) throw new Error("Erro ao criar conta.");

      mode = "otp-register";
      title.innerText = "Verifique seu e-mail";
      subtitle.innerText = "Digite o código enviado";
      otp.classList.remove("hidden");
      button.innerText = "Confirmar código";
      toggle.style.display = "none";
      return;
    }

    /* ======================
       VERIFY REGISTER OTP
    ====================== */
    if (mode === "otp-register") {
      const r = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value.trim(),
          otp: otp.value.trim()
        })
      });

      const d = await r.json();
      if (!d.ok) throw new Error("Código inválido.");

      window.location.href = "index.html";
      return;
    }

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
      if (!d.ok) throw new Error("Email ou senha inválidos.");

      mode = "otp-login";
      title.innerText = "Confirmação de segurança";
      subtitle.innerText = "Digite o código enviado ao e-mail";
      otp.classList.remove("hidden");
      button.innerText = "Confirmar login";
      toggle.style.display = "none";
      return;
    }

    /* ======================
       CONFIRM LOGIN OTP
    ====================== */
    if (mode === "otp-login") {
      const r = await fetch(`${API}/auth/confirm-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.value.trim(),
          otp: otp.value.trim()
        })
      });

      const d = await r.json();
      if (!d.ok) throw new Error("Código inválido.");

      localStorage.setItem("nexus_token", d.token);
      window.location.href = "index.html";
      return;
    }

  } catch (err) {
    message.innerText = err.message;
  } finally {
    button.disabled = false;
  }
};