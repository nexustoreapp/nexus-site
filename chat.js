// chat.js

const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const chatPlan = document.getElementById("chat-plan");
const chatInput = document.getElementById("chat-input");

// API base (config.js pode setar window.NEXUS_API_BASE)
const API =
  window.NEXUS_API_BASE ||
  "https://nexus-site-oufm.onrender.com";

// conversa persistente (não reseta)
const CONV_KEY = "nexus_chat_conversation_id";
let conversationId = localStorage.getItem(CONV_KEY);
if (!conversationId) {
  conversationId = `web_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(CONV_KEY, conversationId);
}

// plano do usuário (por enquanto: automático = localStorage, fallback free)
const PLAN_KEY = "nexus_user_plan";
function getUserPlan() {
  const stored = (localStorage.getItem(PLAN_KEY) || "").toLowerCase().trim();
  return stored || (chatPlan?.value || "free");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function addMessage(text, from = "user", meta = {}) {
  const msg = document.createElement("div");
  msg.className = `chat-message chat-message-${from}`;

  let metaLine = "";
  if (from === "bot" && meta.personaLabel) {
    metaLine = `<div class="chat-meta">${escapeHtml(meta.personaLabel)}</div>`;
  }

  msg.innerHTML = `
    ${metaLine}
    <div class="chat-bubble">${escapeHtml(text)}</div>
  `;

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addTyping() {
  const typing = document.createElement("div");
  typing.className = "chat-message chat-message-bot typing";
  typing.innerHTML = `<div class="chat-bubble">Digitando…</div>`;
  chatBox.appendChild(typing);
  chatBox.scrollTop = chatBox.scrollHeight;
  return typing;
}

async function sendMessage(text) {
  const plan = getUserPlan();

  addMessage(text, "user");
  const typing = addTyping();

  try {
    const resp = await fetch(`${API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        plan,
        conversationId,
      }),
    });

    const data = await resp.json();
    typing.remove();

    if (!data.ok) {
      addMessage(
        "Tive um problema pra responder agora. Tenta de novo em instantes.",
        "bot",
        { personaLabel: "Nexus IA" }
      );
      return;
    }

    addMessage(data.reply, "bot", {
      personaLabel: data.personaLabel || "Nexus IA",
    });
  } catch (e) {
    console.error("Erro no chat:", e);
    typing.remove();
    addMessage(
      "Não consegui conectar no servidor agora. Verifica se ele está rodando.",
      "bot",
      { personaLabel: "Nexus IA" }
    );
  }
}

chatForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = (chatInput.value || "").trim();
  if (!text) return;
  chatInput.value = "";
  sendMessage(text);
});

// Mensagem inicial (uma vez por carregamento)
addMessage(
  "Oi! Eu sou a Nexus IA. Me diz o que você quer comprar e o seu orçamento que eu te recomendo opções reais do catálogo 🙂",
  "bot",
  { personaLabel: "Nexus IA" }
);
