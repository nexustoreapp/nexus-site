(function () {
  const API =
    (window.NEXUS_API || "").replace(/\/$/, "") ||
    (window.BACKEND_URL || "").replace(/\/$/, "") ||
    "";

  const els = {
    showLogin: document.getElementById("showLogin"),
    showRegister: document.getElementById("showRegister"),

    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),

    loginEmail: document.getElementById("loginEmail"),
    loginPassword: document.getElementById("loginPassword"),
    loginMsg: document.getElementById("loginMsg"),

    regName: document.getElementById("regName"),
    regEmail: document.getElementById("regEmail"),
    regPassword: document.getElementById("regPassword"),
    registerMsg: document.getElementById("registerMsg")
  };

  function setMsg(el, type, text) {
    if (!el) return;
    el.className = "msg show " + (type === "ok" ? "ok" : "err");
    el.textContent = text || "";
  }

  function clearMsg(el) {
    if (!el) return;
    el.className = "msg";
    el.textContent = "";
  }

  function toggle(mode) {
    clearMsg(els.loginMsg);
    clearMsg(els.registerMsg);

    if (mode === "register") {
      els.showRegister?.classList.add("active");
      els.showLogin?.classList.remove("active");

      els.registerForm?.classList.add("active");
      els.loginForm?.classList.remove("active");
    } else {
      els.showLogin?.classList.add("active");
      els.showRegister?.classList.remove("active");

      els.loginForm?.classList.add("active");
      els.registerForm?.classList.remove("active");
    }
  }

  els.showLogin?.addEventListener("click", () => toggle("login"));
  els.showRegister?.addEventListener("click", () => toggle("register"));

  function getCaptchaResponse(which) {
    try {
      if (!window.grecaptcha) return "";
      // se você renderizou explicit, o getResponse() sem id costuma funcionar também
      // mas aqui tentamos pegar o correto se existir:
      if (which === "login" && typeof window.__captchaLogId !== "undefined") {
        return window.grecaptcha.getResponse(window.__captchaLogId) || "";
      }
      if (which === "register" && typeof window.__captchaRegId !== "undefined") {
        return window.grecaptcha.getResponse(window.__captchaRegId) || "";
      }
      return window.grecaptcha.getResponse() || "";
    } catch {
      return "";
    }
  }

  function resetCaptcha(which) {
    try {
      if (!window.grecaptcha) return;
      if (which === "login" && typeof window.__captchaLogId !== "undefined") {
        window.grecaptcha.reset(window.__captchaLogId);
        return;
      }
      if (which === "register" && typeof window.__captchaRegId !== "undefined") {
        window.grecaptcha.reset(window.__captchaRegId);
        return;
      }
      window.grecaptcha.reset();
    } catch {}
  }

  // =========================
  // LOGIN
  // =========================
  els.loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg(els.loginMsg);

    if (!API) {
      setMsg(els.loginMsg, "err", "Config faltando: NEXUS_API (config.js).");
      return;
    }

    const email = (els.loginEmail?.value || "").trim().toLowerCase();
    const password = els.loginPassword?.value || "";

    const recaptchaToken = getCaptchaResponse("login");
    if (!recaptchaToken) {
      setMsg(els.loginMsg, "err", "Captcha obrigatório (marque a caixa).");
      return;
    }

    try {
      const r = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, recaptchaToken })
      });

      const d = await r.json().catch(() => null);

      if (!r.ok || !d?.ok) {
        resetCaptcha("login");
        setMsg(els.loginMsg, "err", d?.error || "Erro ao fazer login.");
        return;
      }

      // guarda token
      if (d?.token) {
        localStorage.setItem("nexus_token", d.token);
      }

      setMsg(els.loginMsg, "ok", "Login OK! Redirecionando...");
      setTimeout(() => {
        window.location.href = "minha-conta.html";
      }, 600);
    } catch (err) {
      resetCaptcha("login");
      setMsg(els.loginMsg, "err", "Falha de rede ao fazer login.");
    }
  });

  // =========================
  // REGISTER
  // =========================
  els.registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg(els.registerMsg);

    if (!API) {
      setMsg(els.registerMsg, "err", "Config faltando: NEXUS_API (config.js).");
      return;
    }

    const name = (els.regName?.value || "").trim();
    const email = (els.regEmail?.value || "").trim().toLowerCase();
    const password = els.regPassword?.value || "";

    const recaptchaToken = getCaptchaResponse("register");
    if (!recaptchaToken) {
      setMsg(els.registerMsg, "err", "Captcha obrigatório (marque a caixa).");
      return;
    }

    try {
      const r = await fetch(`${API}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, recaptchaToken })
      });

      const d = await r.json().catch(() => null);

      if (!r.ok || !d?.ok) {
        resetCaptcha("register");
        setMsg(els.registerMsg, "err", d?.error || "Erro ao cadastrar.");
        return;
      }

      setMsg(els.registerMsg, "ok", "Cadastro OK! Agora faz login.");
      resetCaptcha("register");

      // troca pra tela de login e preenche email
      toggle("login");
      if (els.loginEmail) els.loginEmail.value = email;
      if (els.loginPassword) els.loginPassword.value = "";
    } catch (err) {
      resetCaptcha("register");
      setMsg(els.registerMsg, "err", "Falha de rede ao cadastrar.");
    }
  });

  // inicia no login
  toggle("login");
})();