/**
 * chat.js (Yara Nexus)
 * Usa NEXUS_API (ex: https://nexus-site-oufm.onrender.com/api/v1)
 * Endpoint esperado: GET {NEXUS_API}/chat?message=...
 */
(function () {
  const API = (window.NEXUS_API || "").replace(/\/$/, "");
  const $ = (id) => document.getElementById(id);

  function addMsg(who, text) {
    const wrap = $("chatMessages");
    if (!wrap) return;
    const div = document.createElement("div");
    div.className = "msg " + (who === "user" ? "msg-user" : "msg-bot");
    div.textContent = text;
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
  }

  async function send() {
    const input = $("chatInput");
    const btn = $("chatSendBtn");
    const msg = (input?.value || "").trim();
    if (!msg) return;
    input.value = "";
    addMsg("user", msg);

    if (!API) {
      addMsg("bot", "API não configurada (NEXUS_API).");
      return;
    }

    if (btn) btn.disabled = true;

    try {
      const url = `${API}/chat?message=${encodeURIComponent(msg)}`;
      const r = await fetch(url, { method: "GET" });
      const d = await r.json().catch(() => null);

      if (!r.ok || !d?.ok) {
        addMsg("bot", d?.error || "Erro ao falar com a Yara.");
      } else {
        addMsg("bot", d.reply || "(sem resposta)");
      }
    } catch (e) {
      addMsg("bot", "Erro de rede ao falar com a Yara.");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = $("chatSendBtn");
    const input = $("chatInput");
    if (btn) btn.addEventListener("click", send);
    if (input) input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") send();
    });

    addMsg("bot", "Oi! Eu sou a Yara. Me diz o que você quer encontrar na Nexus 😄");
  });
})();