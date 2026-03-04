// login.js (Nexus Store)
// - Login + Cadastro no mesmo form
// - reCAPTCHA explícito só no modo cadastro
// - NÃO desativa reCAPTCHA (apenas orienta se domínio inválido)

function $(id) {
  return document.getElementById(id);
}

function setVisible(el, visible) {
  if (!el) return;
  el.style.display = visible ? "" : "none";
}

function setDisabled(el, disabled) {
  if (!el) return;
  el.disabled = !!disabled;
  el.style.opacity = disabled ? "0.7" : "";
  el.style.pointerEvents = disabled ? "none" : "";
}

function setFormError(msg) {
  const box = $("formError");
  if (!box) return;
  box.textContent = msg || "";
  setVisible(box, !!msg);
}

function setCaptchaOwnerError(html) {
  const box = $("captchaOwnerError");
  if (!box) return;
  box.innerHTML = html || "";
  setVisible(box, !!html);
}

function getToken() {
  return localStorage.getItem("nexus_token");
}

function setToken(token) {
  localStorage.setItem("nexus_token", token);
}

function clearToken() {
  localStorage.removeItem("nexus_token");
}

function normalizeCpf(v) {
  return String(v || "").replace(/\D+/g, "").slice(0, 11);
}

function normalizePhone(v) {
  return String(v || "").replace(/\D+/g, "").slice(0, 11);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function showRecaptchaDomainHint() {
  const host = (window.location.hostname || "").toLowerCase();

  const hints = [
    "<b>reCAPTCHA bloqueado / sem resposta.</b><br/>",
    "Isso geralmente é <b>domínio não autorizado</b> na Site Key do reCAPTCHA.<br/><br/>",
    "No painel do Google reCAPTCHA, adicione estes domínios:<br/>",
    "<code>nexustore.store</code> e <code>www.nexustore.store</code><br/>",
    host && host !== "nexustore.store" && host !== "www.nexustore.store"
      ? `<code>${host}</code> e <code>www.${host}</code><br/>`
      : "",
    "Se estiver usando Render, adicione também o domínio do Render (onrender.com) que você estiver usando."
  ].join("");

  setCaptchaOwnerError(hints);
}

async function ensureRecaptchaReady() {
  const reg = $("registerFields");
  if (!reg || reg.style.display === "none") return true;

  // espera o script do reCAPTCHA carregar
  for (let i = 0; i < 25; i++) {
    if (window.grecaptcha) return true;
    await sleep(200);
  }

  showRecaptchaDomainHint();
  return false;
}

function ensureRecaptchaRendered() {
  // só tenta renderizar se estiver no cadastro e se existir o callback
  const reg = $("registerFields");
  if (!reg || reg.style.display === "none") return;

  try {
    if (window.grecaptcha && typeof window.onRecaptchaLoad === "function") {
      window.onRecaptchaLoad();
    }
  } catch {}
}

let mode = "login";
let busy = false;

function setMode(nextMode) {
  mode = nextMode;

  setFormError("");
  setCaptchaOwnerError("");

  const title = $("formTitle");
  const sub = $("formSubtitle");
  const reg = $("registerFields");
  const btn = $("submitBtn");
  const toggle = $("toggleModeBtn");

  if (mode === "login") {
    if (title) title.textContent = "Entrar";
    if (sub) sub.textContent = "Acesse sua conta para continuar.";
    setVisible(reg, false);
    if (btn) btn.textContent = "Entrar";
    if (toggle) toggle.textContent = "Não tenho conta. Quero cadastrar";
    return;
  }

  // register
  if (title) title.textContent = "Cadastrar";
  if (sub) sub.textContent = "Crie sua conta para continuar.";
  setVisible(reg, true);
  if (btn) btn.textContent = "Criar conta";
  if (toggle) toggle.textContent = "Já tenho conta. Quero entrar";

  // garante render do captcha ao abrir cadastro
  ensureRecaptchaRendered();
}

async function apiPost(path, body) {
  const url = `${window.NEXUS_API}${path}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });

  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}

async function onSubmit(ev) {
  ev.preventDefault();
  if (busy) return;

  setFormError("");
  setCaptchaOwnerError("");

  const submitBtn = $("submitBtn");
  const toggleBtn = $("toggleModeBtn");

  const email = ($("email")?.value || "").trim();
  const password = $("password")?.value || "";

  if (!email || !password) {
    setFormError("Preencha e-mail e senha.");
    return;
  }

  busy = true;
  setDisabled(submitBtn, true);
  setDisabled(toggleBtn, true);

  try {
    if (mode === "login") {
      const { ok, data } = await apiPost("/auth/login", { email, password });

      if (!ok || !data?.ok) {
        setFormError(data?.error || "Erro ao entrar.");
        return;
      }

      if (data.token) setToken(data.token);
      window.location.href = "minha-conta.html";
      return;
    }

    // cadastro
    const ready = await ensureRecaptchaReady();
    if (!ready) return;

    ensureRecaptchaRendered();

    let captcha = "";
    try {
      captcha = window.grecaptcha
        ? grecaptcha.getResponse(window.__nexusRecaptchaWidgetId)
        : "";
    } catch {
      captcha = "";
    }

    if (!captcha) {
      showRecaptchaDomainHint();
      setFormError("Confirme o reCAPTCHA para continuar.");
      return;
    }

    const name = ($("name")?.value || "").trim();
    const cpf = normalizeCpf($("cpf")?.value || "");
    const phone = normalizePhone($("phone")?.value || "");

    const payload = {
      name,
      email,
      password,
      cpf,
      phone,
      recaptchaToken: captcha
    };

    const { ok, data } = await apiPost("/auth/register", payload);

    if (!ok || !data?.ok) {
      setFormError(data?.error || "Erro ao cadastrar.");

      // reseta captcha pra tentar de novo
      try {
        if (window.grecaptcha) grecaptcha.reset(window.__nexusRecaptchaWidgetId);
      } catch {}

      return;
    }

    if (data.token) {
      setToken(data.token);
      window.location.href = "minha-conta.html";
      return;
    }

    setMode("login");
    setFormError("Conta criada. Agora faça login.");
  } finally {
    busy = false;
    setDisabled(submitBtn, false);
    setDisabled(toggleBtn, false);
  }
}

function boot() {
  // Se já tiver token, manda pra conta (pra sair, usa o botão logout na topbar)
  if (getToken()) {
    window.location.href = "minha-conta.html";
    return;
  }

  $("authForm")?.addEventListener("submit", onSubmit);

  $("toggleModeBtn")?.addEventListener("click", () => {
    setMode(mode === "login" ? "register" : "login");
  });

  // começa em login
  setMode("login");
}

boot();