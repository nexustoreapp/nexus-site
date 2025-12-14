// chat.js

const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const chatPlan = document.getElementById("chat-plan");
const chatInput = document.getElementById("chat-input");

// 🔹 API correta (Render)
const API = "https://nexus-site-oufm.onrender.com";

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

async function sendMessage(text) {
  const plan = chatPlan.value || "free";

  addMessage(text, "user");

  try {
    const resp = await fetch(`${API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, plan })
    });

    const data = await resp.json();

    if (!data.ok) {
      addMessage(
        "Tive um problema pra responder agora. Tente novamente em instantes.",
        "bot"
      );
      return;
    }

    addMessage(data.reply, "bot", {
      personaLabel: data.personaLabel
    });
  } catch (err) {
    console.error("Erro no chat:", err);
    addMessage(
      "Não consegui conectar ao servidor da Nexus agora.",
      "bot"
    );
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  sendMessage(text);
});

// Mensagem inicial
addMessage(
  "Oi! Eu sou a IA da Nexus. Posso te ajudar com produtos, pedidos ou planos Nexus+. Sobre o que você quer falar hoje?",
  "bot",
  { personaLabel: "Vendedor Amigo" }
);
