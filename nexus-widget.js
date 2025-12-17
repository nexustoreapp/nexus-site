// nexus-widget.js
(() => {
  if (document.getElementById("nexus-ia-widget")) return;

  const API = "https://nexus-site-oufm.onrender.com";

  // deixa o typing quase instantâneo (sem “atraso fake”)
  const MIN_TYPING_MS = 120;

  // histórico local
  const STORAGE_KEY = "nexus_ia_history_v1";

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = JSON.parse(raw || "[]");
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((x) => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string")
        .slice(-8);
    } catch {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify((history || []).slice(-8)));
    } catch {}
  }

  let history = loadHistory();

  // ===== UI =====
  const widget = document.createElement("div");
  widget.id = "nexus-ia-widget";

  widget.innerHTML = `
    <button id="nexus-ia-btn" class="nexus-ia-btn" aria-label="Abrir Nexus IA">💬</button>

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
        <div class="nexus-ia-row">
          <input id="nexus-ia-input" class="nexus-ia-input" type="text"
            placeholder="Ex: 'PC até 13 mil' ou 'monitor 144hz até 1.200'"
            autocomplete="off" />
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

    wrap.innerHTML = `${metaLine}<div class="nexus-ia-bubble">${text}</div>`;
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

  function renderExistingHistory() {
    // se já tem conversa salva, mostra
    if (history.length) {
      history.forEach((m) => addMsg(m.content, m.role === "assistant" ? "bot" : "user"));
      return;
    }

    // senão, inicia uma vez
    addMsg(
      "Oi! Eu sou a Nexus IA. Me diz o que você quer comprar e seu orçamento que eu te recomendo sem enrolar.",
      "bot",
      { personaLabel: "Nexus IA" }
    );
    history.push({ role: "assistant", content: "Oi! Eu sou a Nexus IA. Me diz o que você quer comprar e seu orçamento que eu te recomendo sem enrolar." });
    saveHistory(history);
  }

  renderExistingHistory();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = (input.value || "").trim();
    if (!text) return;

    input.value = "";

    // UI + histórico
    addMsg(text, "user");
    history.push({ role: "user", content: text });
    history = history.slice(-8);
    saveHistory(history);

    const startedAt = Date.now();
    const typing = addTyping();

    try {
      const resp = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // plano por trás (depois liga no login real)
        body: JSON.stringify({
          message: text,
          plan: "free",
          history: history.slice(0, -1), // manda o histórico anterior (sem duplicar a mensagem atual)
        }),
      });

      const data = await resp.json();

      // typing mínimo curtinho só pra não “piscar”
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_TYPING_MS - elapsed);
      if (remaining) await new Promise((r) => setTimeout(r, remaining));

      typing.remove();

      if (!data.ok) {
        const msg = "Tive um problema agora. Tenta de novo em instantes.";
        addMsg(msg, "bot", { personaLabel: "Nexus IA" });
        history.push({ role: "assistant", content: msg });
        history = history.slice(-8);
        saveHistory(history);
        return;
      }

      addMsg(data.reply, "bot", { personaLabel: data.personaLabel || "Nexus IA" });

      history.push({ role: "assistant", content: data.reply });
      history = history.slice(-8);
      saveHistory(history);
    } catch (err) {
      console.error("Widget chat error:", err);

      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_TYPING_MS - elapsed);
      if (remaining) await new Promise((r) => setTimeout(r, remaining));

      typing.remove();

      const msg = "Não consegui conectar agora. Tenta novamente em instantes.";
      addMsg(msg, "bot", { personaLabel: "Nexus IA" });
      history.push({ role: "assistant", content: msg });
      history = history.slice(-8);
      saveHistory(history);
    }
  });
})();
