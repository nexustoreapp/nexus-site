// login.js
function $(id) {
  return document.getElementById(id);
}

function setVisible(el, visible) {
  if (!el) return;
  el.style.display = visible ? "" : "none";
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
  const host = window.location.hostname || "";
  setCaptchaOwnerError(
    [
      "<b>reCAPTCHA bloqueado.</b><br/>",
      "Isso é <b>configuração do Google reCAPTCHA</b> (domínio não autorizado para esta Site Key).<br/>",
      "No reCAPTCHA Admin, adicione:<br/>",
      `<code>${host}</code> e <code>www.${host}</code>.<br/>`,
      "Se estiver testando no Render, adicione também o domínio do Render."
    ].join("")
  );
}

async function ensureRecaptchaReady() {
  const reg = $("registerFields");
  if (!reg || reg.style.display === "none") return true;

  for (let i = 0; i < 15; i++) {
    if (window.grecaptcha) return true;
    await sleep(200);
  }

  showRecaptchaDomainHint();
  return false;
}

let mode = "login";

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

  if (title) title.textContent = "Cadastrar";
  if (sub) sub.textContent = "Crie sua conta para continuar.";
  setVisible(reg, true);
  if (btn) btn.textContent = "Criar conta";
  if (toggle) toggle.textContent = "Já tenho conta. Quero entrar";

  try {
    if (window.grecaptcha && window.onRecaptchaLoad) window.onRecaptchaLoad();
  } catch {}
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
  setFormError("");
  setCaptchaOwnerError("");

  const email = ($("email")?.value || "").trim();
  const password = $("password")?.value || "";

  if (!email || !password) {
    setFormError("Preencha e-mail e senha.");
    return;
  }

  if (mode === "login") {
    const { ok, data } = await apiPost("/auth/login", { email, password });
    if (!ok || !data?.ok) {
      setFormError(data?.error || "Erro ao entrar.");
      return;
    }
    setToken(data.token);
    window.location.href = "minha-conta.html";
    return;
  }

  const ready = await ensureRecaptchaReady();
  if (!ready) return;

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
}

function boot() {
  if (getToken()) {
    window.location.href = "minha-conta.html";
    return;
  }

  $("authForm")?.addEventListener("submit", onSubmit);

  $("toggleModeBtn")?.addEventListener("click", () => {
    setMode(mode === "login" ? "register" : "login");
  });

  setMode("login");
}

boot();