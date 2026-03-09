// chat.js (Nayla - Assistente Nexus)

(function () {

  const API = window.NEXUS_API;
  const token = localStorage.getItem("nexus_token");

  const panel = document.getElementById("chatPanel");
  const body = document.getElementById("chatBody");
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSend");
  const fab = document.getElementById("chatFab");
  const closeBtn = document.getElementById("chatClose");

  const STORAGE_KEY = "nexus_chat_history";

  if (!API) {
    console.error("NEXUS_API não definido em config.js");
    return;
  }

  /* =========================
  HISTÓRICO LOCAL
  ========================= */

  function saveHistory() {

    const msgs = [];

    body.querySelectorAll(".chat-msg-user, .chat-msg-ai")
      .forEach(el => {

        msgs.push({
          text: el.textContent,
          who: el.classList.contains("chat-msg-user") ? "me" : "ai"
        });

      });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));

  }

  function loadHistory() {

    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return;

    try {

      const msgs = JSON.parse(raw);

      msgs.forEach(m => addMsg(m.text, m.who, false));

    } catch {}

  }

  /* =========================
  ADD MESSAGE
  ========================= */

  function addMsg(text, who, save = true) {

    const wrap = document.createElement("div");

    wrap.className =
      who === "me"
        ? "chat-msg-user"
        : "chat-msg-ai";

    wrap.textContent = text;

    body.appendChild(wrap);

    requestAnimationFrame(() => {
      body.scrollTop = body.scrollHeight;
    });

    if (save) saveHistory();

    return wrap;
  }

  /* =========================
  SEND
  ========================= */

  async function send() {

    const msg = String(input.value || "").trim();

    if (!msg) return;

    input.value = "";

    addMsg(msg, "me");

    const typing = addMsg("Nayla está digitando...", "ai", false);

    try {

      const r = await fetch(`${API}/chat`, {

        method: "POST",

        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {})
        },

        body: JSON.stringify({ message: msg })

      });

      const d = await r.json().catch(() => null);

      if (typing) typing.remove();

      if (!r.ok || !d?.ok) {

        addMsg(d?.error || "Erro ao falar com a Nayla.", "ai");

        return;
      }

      addMsg(d.reply || "Sem resposta.", "ai");

    }
    catch {

      if (typing) typing.remove();

      addMsg("Falha de rede. Tente novamente.", "ai");

    }

  }

  /* =========================
  UI EVENTS
  ========================= */

  if (fab && panel)
    fab.addEventListener("click", () =>
      panel.classList.toggle("open")
    );

  if (closeBtn && panel)
    closeBtn.addEventListener("click", () =>
      panel.classList.remove("open")
    );

  if (sendBtn)
    sendBtn.addEventListener("click", send);

  if (input) {

    input.addEventListener("keydown", (e) => {

      if (e.key === "Enter" && !e.shiftKey) {

        e.preventDefault();
        send();

      }

    });

  }

  /* =========================
  INIT
  ========================= */

  loadHistory();

})();