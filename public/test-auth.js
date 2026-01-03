// public/test-auth.js

const API_BASE = "https://nexus-site-oufm.onrender.com/api";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const cpfInput = document.getElementById("cpf");

const btnRegister = document.getElementById("btn-register");
const btnVerifyOtp = document.getElementById("btn-verify-otp");
const btnLogin = document.getElementById("btn-login");

const responseBox = document.getElementById("response");

function setResponse(text, isError = false) {
  responseBox.innerText = text;
  responseBox.style.color = isError ? "red" : "lime";
}

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch (e) {
    return {
      ok: false,
      error: "INVALID_JSON_RESPONSE",
      raw: text
    };
  }
}

btnRegister.onclick = async () => {
  setResponse("Registrando...");

  const payload = {
    email: emailInput.value.trim(),
    password: passwordInput.value,
    cpf: cpfInput.value.replace(/\D/g, "")
  };

  const data = await post(`${API_BASE}/auth/register`, payload);

  if (data.ok) {
    setResponse("Usuário registrado. Verifique o OTP no email.");
  } else {
    setResponse(JSON.stringify(data), true);
  }
};

btnVerifyOtp.onclick = async () => {
  const email = prompt("Digite seu email para verificar o OTP:");
  if (!email) return;

  const otp = prompt("Digite o OTP recebido no email:");
  if (!otp) return;

  setResponse("Verificando OTP...");

  const data = await post(`${API_BASE}/auth/verify-otp`, {
    email: email.trim(),
    otp: otp.trim()
  });

  if (data.ok) {
    setResponse("Conta verificada com sucesso.");
  } else {
    setResponse(JSON.stringify(data), true);
  }
};

btnLogin.onclick = async () => {
  setResponse("Logando...");

  const payload = {
    email: emailInput.value.trim(),
    password: passwordInput.value
  };

  const data = await post(`${API_BASE}/auth/login`, payload);

  if (data.ok) {
    setResponse("Login OK. Token gerado.");
    console.log("TOKEN:", data.token);
  } else {
    setResponse(JSON.stringify(data), true);
  }
};