// nexus-widget.js
(() => {
  if (document.getElementById("nexus-ia-widget")) return;

  const API = "https://nexus-site-oufm.onrender.com";
  const MIN_TYPING_MS = 700;

  // ===== UI =====
  const widget = document.createElement("div");
  widget.id = "nexus-ia-widget";

  widget.innerHTML = `
    <button id="nexus-ia-btn" class="nexus-ia-btn" aria-label="Abrir Nexus IA">
      💬
    </button>

    <div id="nexus-ia-panel" class="nexus-ia-panel" aria-hidden="true">
      <div class="nexus-ia-header">
        <div class="nexus-ia-title">
          <span class="nexus-ia-dot"></span>
          <strong>Nexus IA</strong>
          <span class="nexus-ia-sub">Atendimento</span>
        </div>
        <button id="nexus-ia-close" class="nexus-ia-close" aria-label="Fechar">✕</button>
      </div>

      <div id="nexus-ia-messages" class="nexus-ia-messages"></div>

      <form id="nexus-ia-form" class="nexus-ia-form">
        <select id="nexus-ia-plan" class="nexus-ia-plan">
          <option value="free">Free</option>
          <option value="core">Core</option>
          <option value="hyper">Hyper</option>
          <option value="omega">Omega</option>
        </select>

        <div class="nexus-ia-row">
          <input id="nexus-ia-input" class="nexus-ia-input" type="text" placeholder="Escreva aqui…" autocomplete="off" />
          <button class="nexus-ia-send" type="submit">Enviar</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(widget);

  const btn = document.getElementById("nexus-ia-btn");
  const panel = document.getElementById("nexus-ia-panel");
  const closeBtn = document.getElementById("nexus-ia-close");
  const messages = document.getElementById("nexus-ia-messages");
  const form = document.getElementById("nexus-ia-form");
  const input = document.getElementById("nexus-ia-input");
  const planSelect = document.getElementById("nexus-ia-plan");

  function openPanel() {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    setTimeout(() => input.focus(), 50);
  }

  function closePanel() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  }

  btn.onclick = () => (panel.classList.contains("open") ? closePanel() : openPanel());
  closeBtn.onclick = () => closePanel();

  function addMsg(text, from = "bot", meta = {}) {
    const wrap = document.createElement("div");
    wrap.className = `nexus-ia-msg nexus-ia-${from}`;

    const metaLine =
      from === "bot" && meta.personaLabel
        ? `<div class="nexus-ia-meta">${meta.personaLabel}</div>`
        : "";

    wrap.innerHTML = `
      ${metaLine}
      <div class="nexus-ia-bubble">${text}</div>
    `;
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
    return wrap;
  }

  function addTyping() {
    const el = document.createElement("div");
    el.className = "nexus-ia-msg nexus-ia-bot nexus-ia-typing";
    el.innerHTML = `<div class="nexus-ia-bubble">Digitando…</div>`;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  // Mensagem inicial
  addMsg(
    "Oi! Eu sou a Nexus IA. Me diz o que você quer comprar (e orçamento) que eu te recomendo do catálogo.",
    "bot",
    { personaLabel: "Nexus IA" }
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = (input.value || "").trim();
    if (!text) return;

    const plan = (planSelect.value || "free").trim();

    input.value = "";
    addMsg(text, "user");

    const startedAt = Date.now();
    const typing = addTyping();

    try {
      const resp = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, plan })
      });

      const data = await resp.json();

      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_TYPING_MS - elapsed);
      await new Promise((r) => setTimeout(r, remaining));

      typing.remove();

      if (!data.ok) {
        addMsg("Tive um problema agora. Tenta de novo em instantes.", "bot", {
          personaLabel: data.personaLabel || "Nexus IA"
        });
        return;
      }

      addMsg(data.reply, "bot", {
        personaLabel: data.personaLabel || "Nexus IA"
      });
    } catch (err) {
      console.error("Widget chat error:", err);

      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_TYPING_MS - elapsed);
      await new Promise((r) => setTimeout(r, remaining));

      typing.remove();
      addMsg("Não consegui conectar agora. Tenta novamente em instantes.", "bot", {
        personaLabel: "Nexus IA"
      });
    }
  });
})();
