// login.js

import { loginUser } from "./authSession.js";

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {

  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {

    await loginUser(email, password);

    window.location.href = "minha-conta.html";

  } catch (err) {

    const error = document.getElementById("errorMessage");
    if (error) {
      error.textContent = err.message;
    }

  }

});