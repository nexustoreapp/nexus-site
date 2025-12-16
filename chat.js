// chat.js

const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const chatPlan = document.getElementById("chat-plan");
const chatInput = document.getElementById("chat-input");

// 🔹 API correta (Render)
const API = "https://nexus-site-oufm.onrender.com";

// ⏱️ tempo mínimo do "Digitando..." (ms)
const MIN_TYPING_MS = 1200;

function addMessage(text, from = "user", meta = {}) {
  const msg = document.createElement("div");
  msg.className = `chat-message chat-message-${from}`;

  let metaLine = "";
  if (from === "bot" && meta.personaLabel) {
    metaLine = `<div class="chat-meta">${meta.personaLabel}</div>`;
  }

  msg.innerHTML = `
    ${metaLine}
    <div class="chat-bubble">${text}</div>
  `;

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addTyping() {
  const typing = document.createElement("div");
  typing.className = "chat-message chat-message-bot typing";
  typing.innerHTML = `<div class="chat-bubble">Só um segundo…</div>`;
  chatBox.appendChild(typing);
  chatBox.scrollTop = chatBox.scrollHeight;
  return typing;
}

async function sendMessage(text) {
  const plan = chatPlan?.value || "free";

  // mostra msg do usuário
  addMessage(text, "user");

  // mostra typing
  const startedAt = Date.now();
  const typing = addTyping();

  try {
    const resp = await fetch(`${API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, plan })
    });

    const data = await resp.json();

    // garante tempo mínimo do typing (pra não piscar)
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, MIN_TYPING_MS - elapsed);
    await new Promise((r) => setTimeout(r, remaining));

    typing.remove();

    if (!data.ok) {
      addMessage("Tive um problema agora, mas já já a gente tenta de novo.", "bot", {
        personaLabel: "Nexus IA"
      });
      return;
    }

    addMessage(data.reply, "bot", {
      personaLabel: data.personaLabel || "Nexus IA"
    });

  } catch (err) {
    console.error("Erro no chat:", err);

    // garante tempo mínimo do typing (mesmo em erro)
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, MIN_TYPING_MS - elapsed);
    await new Promise((r) => setTimeout(r, remaining));

    typing.remove();

    addMessage("Não consegui falar com o servidor agora. Tenta novamente em instantes.", "bot", {
      personaLabel: "Nexus IA"
    });
  }
}

chatForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  sendMessage(text);
});

// Mensagem inicial
addMessage(
  "Oi! Eu sou a IA da Nexus. Me diz o que você quer comprar (e seu orçamento) que eu te guio pro melhor custo-benefício.",
  "bot",
  { personaLabel: "Nexus IA" }
);
