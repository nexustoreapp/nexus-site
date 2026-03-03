// authSession.js

const NEXUS_API = "https://nexus-site-oufm.onrender.com/api/v1";

function saveToken(token) {
  localStorage.setItem("nexus_token", token);
}

function getToken() {
  return localStorage.getItem("nexus_token");
}

function logout() {
  localStorage.removeItem("nexus_token");
  window.location.href = "login.html";
}

async function registerUser(email, password, cpf) {

  const r = await fetch(`${NEXUS_API}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password,
      cpf
    })
  });

  const data = await r.json();

  if (!data.ok) {
    throw new Error(data.error || "Erro ao cadastrar");
  }

  return data;
}

async function loginUser(email, password) {

  const r = await fetch(`${NEXUS_API}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password
    })
  });

  const data = await r.json();

  if (!data.ok) {
    throw new Error(data.error || "Erro ao fazer login");
  }

  saveToken(data.token);

  return data;
}

export {
  loginUser,
  registerUser,
  logout,
  getToken
};