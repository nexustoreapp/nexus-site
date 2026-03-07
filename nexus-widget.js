// nexus-widget.js
(function () {

  const API = window.NEXUS_API || "";

  function createWidget() {

    if (document.getElementById("nexus-ia-widget")) return;

    const wrap = document.createElement("div");
    wrap.id = "nexus-ia-widget";

    wrap.innerHTML = `
      <button id="nexus-ia-fab" title="Falar com Nayla" aria-label="Falar com Nayla">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 14.5C20 17.5376 17.0899 20 13.5 20H8L4 22V14.5C4 11.4624 6.91015 9 10.5 9H13.5C17.0899 9 20 11.4624 20 14.5Z"
            stroke="white"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="9.5" cy="14.5" r="1.1" fill="white"/>
          <circle cx="12.5" cy="14.5" r="1.1" fill="white"/>
          <circle cx="15.5" cy="14.5" r="1.1" fill="white"/>
        </svg>
      </button>

      <div id="nexus-ia-panel">
        <div id="nexus-ia-header">
          <div id="nexus-ia-title">Nayla</div>
          <button id="nexus-ia-close" type="button" aria-label="Fechar">✕</button>
        </div>

        <div id="nexus-ia-body"></div>

        <div id="nexus-ia-footer">
          <input id="nexus-ia-input" placeholder="Fale com a Nayla..." />
          <button id="nexus-ia-send" type="button">Enviar</button>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    const fab = wrap.querySelector("#nexus-ia-fab");
    const panel = wrap.querySelector("#nexus-ia-panel");
    const body = wrap.querySelector("#nexus-ia-body");
    const input = wrap.querySelector("#nexus-ia-input");
    const sendBtn = wrap.querySelector("#nexus-ia-send");
    const closeBtn = wrap.querySelector("#nexus-ia-close");

    function addMsg(text, who = "bot") {
      const row = document.createElement("div");
      row.className = "nx-msg " + (who === "user" ? "user" : "bot");

      const bubble = document.createElement("div");
      bubble.className = "nx-bubble";
      bubble.textContent = text;

      row.appendChild(bubble);
      body.appendChild(row);
      body.scrollTop = body.scrollHeight;
    }

    async function send() {
      const msg = (input.value || "").trim();
      if (!msg) return;

      input.value = "";
      addMsg(msg, "user");
      addMsg("Digitando...", "bot");

      const typing = body.lastChild;
      const token = localStorage.getItem("nexus_token");

      try {
        const r = await fetch(`${API}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ message: msg })
        });

        const d = await r.json().catch(() => null);

        if (typing) typing.remove();

        if (!r.ok || !d?.ok) {
          addMsg("Erro ao falar com Nayla.", "bot");
          return;
        }

        addMsg(d.reply || "Sem resposta.", "bot");
      } catch {
        if (typing) typing.remove();
        addMsg("Erro de conexão.", "bot");
      }
    }

    fab.onclick = () => panel.classList.toggle("open");
    closeBtn.onclick = () => panel.classList.remove("open");
    sendBtn.onclick = send;

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") send();
    });

    addMsg("Oi! Eu sou a Nayla 👋", "bot");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }

})();