// chat.js (Nayla - Assistente Nexus)
// Requer: config.js definindo window.NEXUS_API (ex: https://.../api/v1)

(function () {
  const API = window.NEXUS_API;
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

    wrap.className =
      who === "me"
        ? "chat-msg-user"
        : "chat-msg-ai";

    wrap.textContent = text;

    body.appendChild(wrap);

    body.scrollTop = body.scrollHeight;

    return wrap;
  }

  async function send() {

    const msg = String(input.value || "").trim();

    if (!msg) return;

    input.value = "";

    addMsg(msg, "me");

    // animação de digitação
    const typing = addMsg("Nayla está digitando...", "ai");

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

        addMsg(
          d?.error || "Erro ao falar com a Nayla.",
          "ai"
        );

        return;
      }

      addMsg(d.reply || "Sem resposta.", "ai");

    }
    catch (e) {

      if (typing) typing.remove();

      addMsg(
        "Falha de rede. Tente novamente.",
        "ai"
      );

    }

  }

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
      if (e.key === "Enter") send();
    });
  }

})();