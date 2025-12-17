// buscar.js
const API =
  window.NEXUS_API_BASE ||
  "https://nexus-site-oufm.onrender.com";

const PLAN_KEY = "nexus_user_plan";
function getUserPlan() {
  const p = (localStorage.getItem(PLAN_KEY) || "").toLowerCase().trim();
  return p || "free";
}
function planRank(plan) {
  if (plan === "omega") return 4;
  if (plan === "hyper") return 3;
  if (plan === "core") return 2;
  return 1;
}
function tierLabel(tier) {
  const t = (tier || "free").toLowerCase();
  if (t === "omega") return "Conteúdo OMEGA";
  if (t === "hyper") return "Conteúdo HYPER";
  if (t === "core") return "Conteúdo CORE";
  return "";
}
function formatBRL(n) {
  try {
    return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${n}`;
  }
}

const resultsGrid = document.getElementById("results-grid");
const metaEl = document.getElementById("search-meta");

function getQueryFromUrl() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("q") || "").trim();
}

function renderCard(p) {
  const plan = getUserPlan();
  const userRank = planRank(plan);
  const required = planRank((p.accessTier || "free").toLowerCase());
  const locked = userRank < required;

  const badge = tierLabel(p.accessTier);
  const badgeHtml = badge
    ? `<span class="badge badge-tier">${badge}</span>`
    : "";

  const img = (p.images && p.images[0]) ? p.images[0] : "";
  const thumb = img
    ? `<div class="result-thumb"><img src="${img}" alt=""></div>`
    : `<div class="thumb-placeholder">Sem imagem</div>`;

  const price = formatBRL(p.pricePublic ?? p.price ?? 0);

  const actionHtml = locked
    ? `<a class="btn-outline full" href="assinatura.html">Ver planos para desbloquear</a>`
    : `<a class="btn-primary" href="produto.html?id=${encodeURIComponent(p.id)}">Ver detalhes</a>`;

  const div = document.createElement("div");
  div.className = "result-card";

  div.innerHTML = `
    ${thumb}
    <div class="result-body">
      <div class="result-header">
        <h2>${p.title}</h2>
        ${badgeHtml}
      </div>
      <div class="result-store">${p.subtitle || ""}</div>

      <div class="result-prices">
        <div class="price-current">${price}</div>
      </div>

      <div class="result-actions">
        ${actionHtml}
      </div>
    </div>
  `;

  return div;
}

async function runSearch() {
  const q = getQueryFromUrl();
  if (!q) {
    metaEl.textContent = "Nenhuma busca informada.";
    return;
  }

  metaEl.textContent = `Buscando: "${q}"…`;

  try {
    const plan = getUserPlan();
    const resp = await fetch(
      `${API}/api/search?query=${encodeURIComponent(q)}&plan=${encodeURIComponent(plan)}`
    );
    const data = await resp.json();

    if (!data.ok) {
      metaEl.textContent = "Falha ao buscar agora. Tenta novamente.";
      return;
    }

    const items = data.items || [];
    metaEl.textContent = `${items.length} resultado(s) para "${q}"`;

    resultsGrid.innerHTML = "";
    items.forEach((p) => resultsGrid.appendChild(renderCard(p)));
  } catch (e) {
    console.error(e);
    metaEl.textContent = "Não consegui conectar no servidor agora.";
  }
}

runSearch();
