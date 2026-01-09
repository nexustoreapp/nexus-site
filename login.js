const API = window.NEXUS_API;

let mode = "login";

const form = document.getElementById("auth-form");
const email = document.getElementById("email");
const password = document.getElementById("password");
const otp = document.getElementById("otp");
const button = document.getElementById("submit-btn");
const message = document.getElementById("message");

async function post(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  return r.json();
}

form.onsubmit = async (e) => {
  e.preventDefault();
  button.disabled = true;
  message.innerText = "";

  try {
    if (mode === "login") {
      const d = await post(`${API}/auth/login`, {
        email: email.value.trim(),
        password: password.value
      });

      if (!d.ok) throw new Error("Credenciais inválidas");

      mode = "otp";
      otp.classList.remove("hidden");
      button.innerText = "Confirmar login";
      return;
    }

    if (mode === "otp") {
      const d = await post(`${API}/auth/confirm-login`, {
        email: email.value.trim(),
        otp: otp.value.trim()
      });

      if (!d.ok) throw new Error("Código inválido");

      localStorage.setItem("nexus_token", d.token);

      const intent = localStorage.getItem("nexus_intent");
      localStorage.removeItem("nexus_intent");

      if (intent?.startsWith("buy")) {
        window.location.href = "produto.html";
      } else {
        window.location.href = "index.html";
      }
    }

  } catch (err) {
    message.innerText = err.message;
  } finally {
    button.disabled = false;
  }
};