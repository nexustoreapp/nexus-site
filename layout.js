/**
 * layout.js
 * Injeta uma TOPBAR única em todas as páginas.
 * - Mostra/oculta botões conforme login
 * - Faz busca (vai para buscar.html?q=...)
 * - Marca link ativo
 */
(function () {
  const PAGES = [
    { href: "index.html", label: "Início" },
    { href: "buscar.html", label: "Buscar" },
    { href: "planos.html", label: "Planos" },
    { href: "assinatura.html", label: "Assinatura" },
    { href: "pedidos.html", label: "Pedidos" },
    { href: "minha-conta.html", label: "Minha conta" },
    { href: "contato.html", label: "Contato" },
    { href: "privacidade.html", label: "Privacidade" },
    { href: "chat.html", label: "IA Nexus" }
  ];

  function getToken() {
    try {
      return localStorage.getItem("nexus_token");
    } catch {
      return null;
    }
  }

  function currentFile() {
    const p = (location.pathname || "").split("/").pop();
    return p || "index.html";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>\"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[c] || c));
  }

  function buildTopbar() {
    const logged = !!getToken();
    const active = currentFile();

    const nav = PAGES.map((p) => {
      const isActive = (p.href === active);
      return `<a class="navlink${isActive ? " active" : ""}" href="${p.href}">${escapeHtml(p.label)}</a>`;
    }).join("");

    const right = logged
      ? `
        <a class="chip hide-mobile" href="minha-conta.html">Minha conta</a>
        <button class="chip" id="logoutBtn" type="button">Sair</button>
      `
      : `
        <a class="chip" href="login.html">Entrar</a>
      `;

    return `
      <header class="topbar" id="topbar">
        <div class="container topbar-inner">
          <a class="brand" href="index.html" aria-label="Nexus Store">
            <img class="brand-logo" src="logo.png" alt="Nexus Store">
            <span class="brand-name">Nexus Store</span>
          </a>

          <div class="searchbar" role="search">
            <input id="topSearchInput" type="search" placeholder="Buscar produtos, serviços, ofertas...">
            <button class="btn btn-primary searchbtn" id="topSearchBtn" type="button">Buscar</button>
          </div>

          <div class="actions">
            ${right}
            <button class="nav-toggle" id="navToggle" type="button" aria-label="Abrir menu">
              <div class="bar"></div><div class="bar"></div><div class="bar"></div>
            </button>
          </div>
        </div>

        <nav class="subnav">
          <div class="container subnav-inner" id="subnavInner">
            ${nav}
          </div>
        </nav>
      </header>
    `;
  }

  function wireTopbar(root) {
    const topbarEl = root.querySelector("#topbar");
    const toggle = root.querySelector("#navToggle");

    if (toggle && topbarEl) {
      toggle.addEventListener("click", () => {
        topbarEl.classList.toggle("open");
      });
    }

    // Busca
    const input = root.querySelector("#topSearchInput");
    const btn = root.querySelector("#topSearchBtn");
    const url = new URL(location.href);
    const currentQ = url.searchParams.get("q") || "";
    if (input) input.value = currentQ;

    function goSearch() {
      const q = (input?.value || "").trim();
      const target = new URL("buscar.html", location.href);
      if (q) target.searchParams.set("q", q);
      location.href = target.toString();
    }

    if (btn) btn.addEventListener("click", goSearch);
    if (input) input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") goSearch();
    });

    // Logout
    const logoutBtn = root.querySelector("#logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (typeof window.NEXUS_logout === "function") return window.NEXUS_logout();
        try {
          localStorage.removeItem("nexus_token");
          localStorage.removeItem("nexus_plan");
          localStorage.removeItem("nexus_plan_intent");
        } catch {}
        location.href = "index.html";
      });
    }
  }

  function mount() {
    const host = document.getElementById("topbar-root");
    if (!host) return;

    host.innerHTML = buildTopbar();
    wireTopbar(host);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();