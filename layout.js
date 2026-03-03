/**
 * layout.js
 * - Padroniza a TOPBAR em todas as páginas (injeta topbar.html dentro do <header class="topbar">)
 * - Marca link ativo, liga menu mobile, liga busca (vai pra buscar.html?q=...)
 * - Mostra "Entrar" ou "Minha conta + Sair" conforme token
 * - Cria bolha flutuante 💬 que abre chat.html (Yara)
 */
(function () {
  function getToken() {
    return localStorage.getItem("nexus_token") || localStorage.getItem("token") || "";
  }

  function decodeJwtPayload(token) {
    try {
      const part = token.split(".")[1];
      if (!part) return null;
      const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  async function injectTopbar() {
    const header = document.querySelector("header.topbar");
    if (!header) return;

    header.classList.add("topbar");

    try {
      const r = await fetch("topbar.html", { cache: "no-store" });
      if (!r.ok) return;
      const html = await r.text();
      header.innerHTML = html;
    } catch {
      return;
    }

    // busca
    const input = document.getElementById("topbarSearchInput");
    const btn = document.getElementById("topbarSearchBtn");
    const doSearch = () => {
      const q = (input?.value || "").trim();
      if (!q) return;
      window.location.href = `buscar.html?q=${encodeURIComponent(q)}`;
    };
    if (btn) btn.addEventListener("click", doSearch);
    if (input) input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });

    // menu mobile
    const toggle = document.getElementById("navToggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        header.classList.toggle("open");
      });
    }

    // link ativo
    const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".subnav .navlink").forEach((a) => {
      const href = (a.getAttribute("href") || "").split("?")[0].toLowerCase();
      if (href === path) a.classList.add("active");
    });

    // auth state
    const token = getToken();
    const isAuthed = !!token;

    document.querySelectorAll("[data-auth='in']").forEach((el) => {
      el.style.display = isAuthed ? "" : "none";
    });
    document.querySelectorAll("[data-auth='out']").forEach((el) => {
      el.style.display = isAuthed ? "none" : "";
    });

    // sair
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (window.nexusLogout) window.nexusLogout();
        else {
          localStorage.removeItem("nexus_token");
          localStorage.removeItem("token");
          localStorage.removeItem("nexus_user");
          window.location.href = "index.html";
        }
      });
    }

    // chip "nome/email"
    const payload = isAuthed ? decodeJwtPayload(token) : null;
    if (payload?.name || payload?.email) {
      const actions = document.getElementById("topbarActions");
      const lb = document.getElementById("logoutBtn");
      if (actions && lb && lb.parentNode) {
        const chip = document.createElement("div");
        chip.className = "chip";
        chip.style.opacity = "0.95";
        chip.textContent = (payload.name || payload.email || "Conta").toString();
        lb.parentNode.insertBefore(chip, lb);
      }
    }
  }

  function ensureChatBubble() {
    if (document.getElementById("nexusChatBubble")) return;

    const page = (location.pathname.split("/").pop() || "").toLowerCase();
    if (page === "chat.html") return;

    const bubble = document.createElement("button");
    bubble.id = "nexusChatBubble";
    bubble.type = "button";
    bubble.title = "Chat (Yara)";
    bubble.innerHTML = "💬";
    bubble.style.position = "fixed";
    bubble.style.right = "16px";
    bubble.style.bottom = "16px";
    bubble.style.width = "56px";
    bubble.style.height = "56px";
    bubble.style.borderRadius = "999px";
    bubble.style.border = "1px solid rgba(148,163,184,.25)";
    bubble.style.background = "rgba(15,23,42,.92)";
    bubble.style.color = "white";
    bubble.style.fontSize = "22px";
    bubble.style.boxShadow = "0 18px 40px rgba(0,0,0,.35)";
    bubble.style.cursor = "pointer";
    bubble.style.zIndex = "9999";

    const panel = document.createElement("div");
    panel.id = "nexusChatPanel";
    panel.style.position = "fixed";
    panel.style.right = "16px";
    panel.style.bottom = "84px";
    panel.style.width = "min(420px, calc(100vw - 32px))";
    panel.style.height = "min(560px, calc(100vh - 140px))";
    panel.style.borderRadius = "18px";
    panel.style.overflow = "hidden";
    panel.style.border = "1px solid rgba(148,163,184,.25)";
    panel.style.boxShadow = "0 24px 60px rgba(0,0,0,.5)";
    panel.style.background = "rgba(0,0,0,.25)";
    panel.style.display = "none";
    panel.style.zIndex = "9999";

    const iframe = document.createElement("iframe");
    iframe.src = "chat.html";
    iframe.title = "Nexus Chat";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    panel.appendChild(iframe);

    bubble.addEventListener("click", () => {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    document.body.appendChild(panel);
    document.body.appendChild(bubble);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await injectTopbar();
    ensureChatBubble();
  });
})();