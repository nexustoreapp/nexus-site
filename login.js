const API = window.NEXUS_API;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("auth-form");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const cpf = document.getElementById("cpf");
  const message = document.getElementById("auth-message");

  form.onsubmit = async (e) => {
    e.preventDefault();
    message.innerText = "Processando...";

    try {
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

      // 🔥 VOLTA PRA HOME
      window.location.href = "index.html";

    } catch (err) {
      message.innerText = "Email ou senha inválidos.";
    }
  };
});