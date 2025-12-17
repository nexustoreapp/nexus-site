// chat.js
const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

const API = "https://nexus-site-oufm.onrender.com";

const STORAGE_KEY = "nexus_chat_page_history_v1";

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string")
      .slice(-8);
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify((history || []).slice(-8)));
  } catch {}
}

let history = loadHistory();

function addMessage(text, from = "user", meta = {}) {
  const msg = document.createElement("div");
  msg.className = `chat-message chat-message-${from}`;

  let metaLine = "";
  if (from === "bot" && meta.personaLabel) {
    metaLine = `<div class="chat-meta">${meta.personaLabel}</div>`;
  }

  msg.innerHTML = `${metaLine}<div class="chat-bubble">${text}</div>`;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function addTyping() {
  const typing = document.createElement("div");
  typing.className = "chat-message chat-message-bot typing";
  typing.innerHTML = `<div class="chat-bubble">Digitando…</div>`;
  chatBox.appendChild(typing);
  chatBox.scrollTop = chatBox.scrollHeight;
  return typing;
}

function renderExisting() {
  if (history.length) {
    history.forEach((m) => addMessage(m.content, m.role === "assistant" ? "bot" : "user", { personaLabel: "Nexus IA" }));
    return;
  }
  const hello = "Oi! Eu sou a Nexus IA. Me fala o que você quer comprar e seu orçamento.";
  addMessage(hello, "bot", { personaLabel: "Nexus IA" });
  history.push({ role: "assistant", content: hello });
  saveHistory(history);
}

renderExisting();

async function sendMessage(text) {
  addMessage(text, "user");
  history.push({ role: "user", content: text });
  history = history.slice(-8);
  saveHistory(history);

  const startedAt = Date.now();
  const typing = addTyping();

  try {
    const resp = await fetch(`${API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        plan: "free",
        history: history.slice(0, -1),
      }),
    });

    const data = await resp.json();

    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, 120 - elapsed);
    if (remaining) await new Promise((r) => setTimeout(r, remaining));

    typing.remove();

    if (!data.ok) {
      const msg = "Tive um problema agora. Tenta de novo em instantes.";
      addMessage(msg, "bot", { personaLabel: "Nexus IA" });
      history.push({ role: "assistant", content: msg });
      history = history.slice(-8);
      saveHistory(history);
      return;
    }

    addMessage(data.reply, "bot", { personaLabel: data.personaLabel || "Nexus IA" });
    history.push({ role: "assistant", content: data.reply });
    history = history.slice(-8);
    saveHistory(history);
  } catch (e) {
    console.error("Erro no chat:", e);

    typing.remove();
    const msg = "Não consegui conectar ao servidor agora.";
    addMessage(msg, "bot", { personaLabel: "Nexus IA" });
    history.push({ role: "assistant", content: msg });
    history = history.slice(-8);
    saveHistory(history);
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = (chatInput.value || "").trim();
  if (!text) return;
  chatInput.value = "";
  sendMessage(text);
});
