const API = "https://nexus-site-oufm.onrender.com/api/v1";

async function registerUser(e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const cpf = document.getElementById("cpf").value.trim();
  const password = document.getElementById("password").value.trim();

  const msg = document.getElementById("registerMsg");

  try {

    const r = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        email,
        cpf,
        password
      })
    });

    const d = await r.json();

    if (!d.ok) {
      msg.innerText = d.error || "Erro ao cadastrar";
      return;
    }

    msg.innerText = "Conta criada!";

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1500);

  } catch (err) {
    msg.innerText = "Erro de conexão";
  }
}

document
  .getElementById("registerForm")
  .addEventListener("submit", registerUser);