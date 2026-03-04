// nexus-widget.js
// =========================================================
// NEXUS IA (widget flutuante)
// - Botão flutuante (draggable)
// - Painel com header (draggable)
// - Salva posição em localStorage (por device)
// =========================================================

(function () {
  const POS_KEY = "nexus_ia_widget_pos_v1";

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function readPos() {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (!p || typeof p.x !== "number" || typeof p.y !== "number") return null;
      return p;
    } catch {
      return null;
    }
  }

  function savePos(x, y) {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({ x, y }));
    } catch {}
  }

  function createWidget() {
    // evita duplicar
    if (document.getElementById("nexus-ia-widget")) return;

    const wrap = document.createElement("div");
    wrap.id = "nexus-ia-widget";

    wrap.innerHTML = `
      <button id="nexus-ia-fab" title="IA da Nexus">
        <span class="dot" aria-hidden="true"></span>
      </button>

      <div id="nexus-ia-panel" role="dialog" aria-label="IA da Nexus">
        <div id="nexus-ia-header">
          <div id="nexus-ia-title">
            <span>IA da Nexus</span>
            <span id="nexus-ia-badge">Beta</span>
          </div>
          <button id="nexus-ia-close" title="Fechar">✕</button>
        </div>

        <div id="nexus-ia-body"></div>

        <div id="nexus-ia-footer">
          <input id="nexus-ia-input" type="text" placeholder="Escreva aqui..." />
          <button id="nexus-ia-send">Enviar</button>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    const fab = wrap.querySelector("#nexus-ia-fab");
    const panel = wrap.querySelector("#nexus-ia-panel");
    const closeBtn = wrap.querySelector("#nexus-ia-close");
    const header = wrap.querySelector("#nexus-ia-header");
    const body = wrap.querySelector("#nexus-ia-body");
    const input = wrap.querySelector("#nexus-ia-input");
    const sendBtn = wrap.querySelector("#nexus-ia-send");

    // posição inicial
    (function applyInitialPos() {
      const p = readPos();
      if (!p) return; // usa right/bottom default do CSS
      wrap.style.right = "auto";
      wrap.style.bottom = "auto";
      wrap.style.left = p.x + "px";
      wrap.style.top = p.y + "px";
    })();

    function open() {
      panel.classList.add("open");
      // quando abre, esconde o botão (fica só o painel)
      fab.style.display = "none";
      input.focus();
    }

    function close() {
      panel.classList.remove("open");
      fab.style.display = "flex";
    }

    fab.addEventListener("click", () => {
      if (panel.classList.contains("open")) close();
      else open();
    });

    closeBtn.addEventListener("click", close);

    // =====================================================
    // Drag & drop (fab quando fechado, header quando aberto)
    // =====================================================
    function enableDrag(targetEl) {
      let dragging = false;
      let startX = 0, startY = 0;
      let baseLeft = 0, baseTop = 0;

      targetEl.addEventListener("pointerdown", (e) => {
        // não arrasta se clicou no botão fechar
        if (e.target && e.target.id === "nexus-ia-close") return;

        dragging = true;
        targetEl.setPointerCapture(e.pointerId);

        const rect = wrap.getBoundingClientRect();
        // garante usar left/top (não right/bottom) ao arrastar
        wrap.style.right = "auto";
        wrap.style.bottom = "auto";
        wrap.style.left = rect.left + "px";
        wrap.style.top = rect.top + "px";

        startX = e.clientX;
        startY = e.clientY;
        baseLeft = rect.left;
        baseTop = rect.top;

        // evita scroll enquanto arrasta no mobile
        e.preventDefault();
      });

      targetEl.addEventListener("pointermove", (e) => {
        if (!dragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const rect = wrap.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const w = rect.width;
        const h = rect.height;

        const nextLeft = clamp(baseLeft + dx, 6, vw - w - 6);
        const nextTop = clamp(baseTop + dy, 6, vh - h - 6);

        wrap.style.left = nextLeft + "px";
        wrap.style.top = nextTop + "px";

        e.preventDefault();
      });

      targetEl.addEventListener("pointerup", () => {
        if (!dragging) return;
        dragging = false;

        const rect = wrap.getBoundingClientRect();
        savePos(Math.round(rect.left), Math.round(rect.top));
      });

      targetEl.addEventListener("pointercancel", () => {
        dragging = false;
      });
    }

    enableDrag(fab);
    enableDrag(header);

    // =====================================================
    // Chat (envia pro backend)
    // =====================================================
    function addMessage(text, who = "bot") {
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
      addMessage(msg, "user");

      const api = window.NEXUS_API || "";
      if (!api) {
        addMessage("NEXUS_API não definido (config.js).", "bot");
        return;
      }

      try {
        const r = await fetch(`${api}/chat/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg })
        });

        const d = await r.json().catch(() => null);
        if (!r.ok || !d?.ok) {
          addMessage(d?.error || "Erro ao falar com a IA.", "bot");
          return;
        }

        addMessage(d.answer || "OK.", "bot");
      } catch (err) {
        addMessage("Falha de rede ao falar com a IA.", "bot");
      }
    }

    sendBtn.addEventListener("click", send);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") send();
    });

    // mensagem inicial
    addMessage("Oi! Eu sou a IA da Nexus. Como posso ajudar? 😊", "bot");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }
})();