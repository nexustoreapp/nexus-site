// chat.js (IA Nexus)
// Requer: config.js definindo window.NEXUS_API (ex: https://.../api/v1)

(function () {
  const API = window.NEXUS_API; // já vem com /api/v1
  const token = localStorage.getItem("nexus_token");

  const panel = document.getElementById("chatPanel");
  const body = document.getElementById("chatBody");
  const input = document.getElementById("chatInput");
  const sendBtn = document.getElementById("chatSend");
  const fab = document.getElementById("chatFab");
  const closeBtn = document.getElementById("chatClose");

  if (!API) {
    console.error("NEXUS_API não definido em config.js");
    return;
  }

  function addMsg(text, who) {
    const wrap = document.createElement("div");
    wrap.style.margin = "10px 0";
    wrap.style.display = "flex";
    wrap.style.justifyContent = who === "me" ? "flex-end" : "flex-start";

    const bubble = document.createElement("div");
    bubble.style.maxWidth = "85%";
    bubble.style.padding = "10px 12px";
    bubble.style.borderRadius = "14px";
    bubble.style.border = "1px solid rgba(148,163,184,.18)";
    bubble.style.background =
      who === "me" ? "rgba(255,43,43,.12)" : "rgba(255,255,255,.04)";
    bubble.style.whiteSpace = "pre-wrap";
    bubble.textContent = text;

    wrap.appendChild(bubble);
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;
  }

  async function send() {
    const msg = String(input.value || "").trim();
    if (!msg) return;

    input.value = "";
    addMsg(msg, "me");

    // feedback rápido
    addMsg("Digitando…", "ai");
    const typingEl = body.lastChild;

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

      // remove "Digitando…"
      if (typingEl) typingEl.remove();

      if (!r.ok || !d?.ok) {
        addMsg(d?.error || "Erro ao falar com a IA Nexus.", "ai");
        return;
      }

      addMsg(d.reply || "Sem resposta.", "ai");
    } catch (e) {
      if (typingEl) typingEl.remove();
      addMsg("Falha de rede. Tenta de novo.", "ai");
    }
  }

  // abrir/fechar
  if (fab && panel) fab.addEventListener("click", () => panel.classList.toggle("open"));
  if (closeBtn && panel) closeBtn.addEventListener("click", () => panel.classList.remove("open"));

  // enviar
  if (sendBtn) sendBtn.addEventListener("click", send);
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") send();
    });
  }
})();