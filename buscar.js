// buscar.js (VERSÃO FINAL - compatível com /api/search do backend)

const API = window.NEXUS_API || "https://nexus-site-oufm.onrender.com";

// Usa o mesmo localStorage do config.js
function getUserPlan() {
  try {
    return (localStorage.getItem("nexus_plan") || "free").toLowerCase().trim();
  } catch {
    return "free";
  }
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getQueryParam() {
  const sp = new URLSearchParams(window.location.search);
  // aceita q ou query (se você usar os dois em algum lugar)
  return (sp.get("q") || sp.get("query") || "").trim();
}

function getPageParam() {
  const sp = new URLSearchParams(window.location.search);
  const p = Number(sp.get("page") || 1);
  return Number.isFinite(p) && p > 0 ? p : 1;
}

function renderCard(p, plan) {
  const el = document.createElement("div");
  el.className = "card-info"; // usa estilo já existente no seu CSS

  const title = p.title || "Produto";
  const subtitle = p.subtitle || "";
  const brand = p.brand ? `• ${p.brand}` : "";
  const category = p.category ? `• ${p.category}` : "";

  // FREE vê pricePublic; premium vê pricePremium (se existir)
  const price =
    plan === "free" ? (p.pricePublic ?? p.pricePremium) : (p.pricePremium ?? p.pricePublic);

  el.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <div>
        <div style="font-weight:800; font-size:1.05rem;">${title}</div>
        <div style="opacity:.85; margin-top:4px;">${subtitle}</div>
        <div style="opacity:.7; margin-top:6px; font-size:.95rem;">${brand} ${category}</div>
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        <div style="font-weight:900; font-size:1.1rem;">${money(price)}</div>
        <a class="btn" href="assinatura.html" style="text-decoration:none;">
          ${plan === "free" ? "Desbloquear mais ofertas" : "Ver detalhes"}
        </a>
      </div>
    </div>
  `;

  return el;
}

async function runSearch() {
  const metaEl = document.getElementById("search-meta");
  const resultsGrid = document.getElementById("results-grid");

  const plan = getUserPlan();
  const q = getQueryParam();
  const page = getPageParam();
  const limit = 24;

  metaEl.textContent = "Buscando...";
  resultsGrid.innerHTML = "";

  try {
    const url =
      `${API}/api/search` +
      `?q=${encodeURIComponent(q)}` +
      `&plan=${encodeURIComponent(plan)}` +
      `&page=${encodeURIComponent(page)}` +
      `&limit=${encodeURIComponent(limit)}`;

    const r = await fetch(url);
    const data = await r.json();

    // ✅ AQUI é o pulo do gato:
    // seu backend devolve "produtos"
    const items = data.produtos || data.items || [];
    const total = Number.isFinite(data.total) ? data.total : items.length;

    metaEl.textContent =
      q
        ? `${total} resultado(s) para "${q}" • plano: ${plan}`
        : `${total} produto(s) • plano: ${plan}`;

    if (!items.length) {
      resultsGrid.innerHTML = `<div class="card-info">Nenhum resultado encontrado.</div>`;
      return;
    }

    items.forEach((p) => resultsGrid.appendChild(renderCard(p, plan)));
  } catch (e) {
    console.error(e);
    metaEl.textContent = "Não consegui conectar no servidor agora.";
    resultsGrid.innerHTML = `<div class="card-info">Erro ao buscar. Tente novamente.</div>`;
  }
}

runSearch();
