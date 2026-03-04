// ======================================================
// chat.js — IA Nexus (widget flutuante + drag + chat UI)
// Requisitos no HTML:
//  - #chatFab, #chatPanel, #chatClose
//  - #chatBody, #chatInput, #chatSend
// Usa endpoint:
//  - window.NEXUS_CHAT_ENDPOINT (se existir)
//  - senão: `${window.NEXUS_API}/chat`
// ======================================================

(function () {
  const fab = document.getElementById("chatFab");
  const panel = document.getElementById("chatPanel");
  const closeBtn = document.getElementById("chatClose");
  const body = document.getElementById("chatBody");
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSend");

  if (!fab || !panel || !closeBtn || !body || !input || !sendBtn) return;

  const STORAGE_KEY_POS = "nexus_chat_fab_pos_v1";
  const STORAGE_KEY_CHAT = "nexus_chat_history_v1";

  // ========= Endpoint (não inventa env nova) =========
  const API = window.NEXUS_API || "";
  const CHAT_ENDPOINT =
    window.NEXUS_CHAT_ENDPOINT ||
    (API ? `${API}/chat` : "");

  // ========= Helpers =========
  function esc(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function scrollBottom() {
    body.scrollTop = body.scrollHeight;
  }

  function addMsg(role, text) {
    const wrap = document.createElement("div");
    wrap.style.margin = "10px 0";
    wrap.style.display = "flex";
    wrap.style.justifyContent = role === "user" ? "flex-end" : "flex-start";

    const bubble = document.createElement("div");
    bubble.className = "soft";
    bubble.style.padding = "10px 12px";
    bubble.style.maxWidth = "85%";
    bubble.style.whiteSpace = "pre-wrap";
    bubble.style.wordBreak = "break-word";
    bubble.style.borderRadius = "16px";
    bubble.style.border = "1px solid rgba(148,163,184,.14)";

    if (role === "user") {
      bubble.style.background = "rgba(255,255,255,.05)";
      bubble.innerHTML = `<b>Você:</b> ${esc(text)}`;
    } else if (role === "ai") {
      bubble.style.background = "rgba(255,43,43,.10)";
      bubble.style.borderColor = "rgba(255,43,43,.22)";
      bubble.innerHTML = `<b>IA:</b> ${esc(text)}`;
    } else {
      bubble.innerHTML = esc(text);
    }

    wrap.appendChild(bubble);
    body.appendChild(wrap);
    scrollBottom();

    // salva histórico
    try {
      const hist = loadHistory();
      hist.push({ role, text, ts: Date.now() });
      localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(hist.slice(-50)));
    } catch {}
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CHAT);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function renderHistory() {
    const hist = loadHistory();
    if (!hist.length) return;
    body.innerHTML = "";
    hist.forEach((m) => addMsg(m.role, m.text));
  }

  function setFabPos(x, y) {
    fab.style.left = x + "px";
    fab.style.top = y + "px";
    fab.style.right = "auto";
    fab.style.bottom = "auto";
  }

  function clampFabPos(x, y) {
    const pad = 8;
    const rect = fab.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - pad;
    const maxY = window.innerHeight - rect.height - pad;
    return {
      x: Math.max(pad, Math.min(maxX, x)),
      y: Math.max(pad, Math.min(maxY, y)),
    };
  }

  function saveFabPos(x, y) {
    try {
      localStorage.setItem(STORAGE_KEY_POS, JSON.stringify({ x, y }));
    } catch {}
  }

  function restoreFabPos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_POS);
      if (!raw) return;
      const pos = JSON.parse(raw);
      if (typeof pos?.x === "number" && typeof pos?.y === "number") {
        const c = clampFabPos(pos.x, pos.y);
        setFabPos(c.x, c.y);
      }
    } catch {}
  }

  // ========= Open/Close =========
  function openChat() {
    panel.classList.add("open");
    setTimeout(() => input?.focus(), 50);
  }
  function closeChat() {
    panel.classList.remove("open");
  }

  closeBtn.addEventListener("click", closeChat);

  // ========= Drag FAB (arrastável) =========
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;

  fab.style.touchAction = "none"; // importante p/ mobile

  fab.addEventListener("pointerdown", (e) => {
    dragging = true;
    moved = false;
    fab.setPointerCapture(e.pointerId);

    const rect = fab.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    offsetX = startX - rect.left;
    offsetY = startY - rect.top;
  });

  fab.addEventListener("pointermove", (e) => {
    if (!dragging) return;

    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx > 6 || dy > 6) moved = true;

    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    const c = clampFabPos(x, y);
    setFabPos(c.x, c.y);
  });

  fab.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    dragging = false;

    const rect = fab.getBoundingClientRect();
    saveFabPos(rect.left, rect.top);

    // se NÃO arrastou, é clique
    if (!moved) {
      panel.classList.toggle("open");
      if (panel.classList.contains("open")) input?.focus();
    }
  });

  window.addEventListener("resize", () => {
    // re-clamp
    const rect = fab.getBoundingClientRect();
    const c = clampFabPos(rect.left, rect.top);
    setFabPos(c.x, c.y);
    saveFabPos(c.x, c.y);
  });

  // ========= Send message =========
  async function sendMessage() {
    const text = (input.value || "").trim();
    if (!text) return;

    addMsg("user", text);
    input.value = "";

    // placeholder "digitando..."
    const typing = document.createElement("div");
    typing.className = "helper";
    typing.style.marginTop = "8px";
    typing.innerText = "IA está respondendo...";
    body.appendChild(typing);
    scrollBottom();

    try {
      if (!CHAT_ENDPOINT) {
        typing.remove();
        addMsg("ai", "Endpoint do chat não configurado. Defina NEXUS_API no config.js ou NEXUS_CHAT_ENDPOINT.");
        return;
      }

      // manda histórico curto (últimas 10 mensagens)
      const hist = loadHistory().slice(-10);

      const r = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: hist,
          source: "frontend-chat"
        }),
      });

      const data = await r.json().catch(() => null);

      typing.remove();

      if (!r.ok || !data) {
        addMsg("ai", `Erro no chat (${r.status}).`);
        return;
      }

      // suporte a formatos comuns
      const answer =
        data.reply ||
        data.answer ||
        data.message ||
        data.text ||
        (typeof data === "string" ? data : null);

      if (!answer) {
        addMsg("ai", "Recebi resposta do servidor, mas veio vazia.");
        return;
      }

      addMsg("ai", String(answer));
    } catch (err) {
      typing.remove();
      addMsg("ai", "Falha ao conectar no chat. (Verifique o endpoint e o backend).");
      console.error(err);
    }
  }

  sendBtn.addEventListener("click", sendMessage);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  // ========= Boot =========
  restoreFabPos();
  // se tiver histórico, mostra
  renderHistory();

})();