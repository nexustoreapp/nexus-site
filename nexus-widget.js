// nexus-widget.js

// 🔹 API do backend (Render)
const API = "https://nexus-site-oufm.onrender.com";

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function addMessage(container, text, from = "user", personaLabel = "") {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "6px";
  wrap.style.alignSelf = from === "user" ? "flex-end" : "flex-start";

  if (from === "bot" && personaLabel) {
    const meta = document.createElement("div");
    meta.className = "nx-meta";
    meta.textContent = personaLabel;
    wrap.appendChild(meta);
  }

  const msg = document.createElement("div");
  msg.className = `nx-msg ${from}`;
  msg.textContent = text;
  wrap.appendChild(msg);

  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

async function sendToIA(bodyEl, text) {
  const payload = { message: text, plan: "free" };

  const resp = await fetch(`${API}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await resp.json();
  if (!data.ok) throw new Error(data.error || "Falha no chat");
  return data;
}

function mountWidget() {
  // Launcher
  const launcher = el(`
    <button id="nexus-ia-launcher" type="button" aria-label="Abrir Nexus IA">
      <div class="nx-orb"></div>
      <div class="nx-launcher-text">
        <div class="nx-launcher-title">Nexus IA</div>
        <div class="nx-launcher-sub">Atendimento inteligente</div>
      </div>
    </button>
  `);

  // Panel
  const panel = el(`
    <div id="nexus-ia-panel" role="dialog" aria-label="Nexus IA">
      <div class="nx-head">
        <div class="nx-head-left">
          <div class="nx-orb" style="width:26px;height:26px;"></div>
          <div>
            <div class="nx-head-title">Nexus IA</div>
            <div class="nx-meta" style="margin:0;">segurança • vantagem • exclusividade</div>
          </div>
          <div class="nx-head-badge">online</div>
        </div>
        <button class="nx-close" type="button" aria-label="Fechar">✕</button>
      </div>

      <div class="nx-body" id="nx-body"></div>

      <form class="nx-foot" id="nx-form">
        <input class="nx-input" id="nx-input" placeholder="Digite sua mensagem..." autocomplete="off" />
        <button class="nx-send" type="submit">Enviar</button>
      </form>
    </div>
  `);

  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  const bodyEl = panel.querySelector("#nx-body");
  const form = panel.querySelector("#nx-form");
  const input = panel.querySelector("#nx-input");
  const closeBtn = panel.querySelector(".nx-close");

  function open() {
    panel.classList.add("open");
    input.focus();
  }
  function close() {
    panel.classList.remove("open");
  }

  launcher.addEventListener("click", () => {
    if (panel.classList.contains("open")) close();
    else open();
  });

  closeBtn.addEventListener("click", close);

  // Mensagem inicial
  addMessage(
    bodyEl,
    "Oi! Eu sou a Nexus IA. Me diz: você quer algo gamer (FPS/Setup) ou algo pra escritório/produtividade? E qual seu orçamento?",
    "bot",
    "Nexus IA"
  );

  let sending = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || sending) return;

    input.value = "";
    addMessage(bodyEl, text, "user");

    sending = true;
    try {
      // micro feedback
      addMessage(bodyEl, "Só um segundo…", "bot", "Nexus IA");
      const lastBot = bodyEl.lastChild;

      const data = await sendToIA(bodyEl, text);

      // remove “Só um segundo…”
      if (lastBot && lastBot.remove) lastBot.remove();

      addMessage(bodyEl, data.reply, "bot", data.personaLabel || "Nexus IA");
    } catch (err) {
      addMessage(
        bodyEl,
        "Não consegui conectar agora. Tenta de novo em instantes.",
        "bot",
        "Nexus IA"
      );
      console.error(err);
    } finally {
      sending = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", mountWidget);