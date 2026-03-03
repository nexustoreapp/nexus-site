const API = "https://nexus-site-oufm.onrender.com/api/v1";

async function loginUser(e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const msg = document.getElementById("loginMsg");

  try {

    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const d = await r.json();

    if (!d.ok) {
      msg.innerText = d.error || "Erro ao fazer login";
      return;
    }

    localStorage.setItem("nexus_token", d.token);

    window.location.href = "minha-conta.html";

  } catch (err) {
    msg.innerText = "Erro de conexão";
  }
}

document
  .getElementById("loginForm")
  .addEventListener("submit", loginUser);