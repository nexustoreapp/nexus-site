// buscar.js (COMPATÍVEL COM O BACKEND C)
// - Usa /api/search?q=
// - Lê data.produtos
// - Usa p.tier (free/core/hyper/omega)

const API =
  window.NEXUS_API_BASE ||
  window.NEXUS_API ||
  "https://nexus-site-oufm.onrender.com";

const PLAN_KEY = "nexus_user_plan"; // mantém o mesmo que você já usa
function getUserPlan() {
  const p = (localStorage.getItem(PLAN_KEY) || "").toLowerCase().trim();
  return p || "free";
}

function planRank(plan) {
  if (plan === "omega") return 4;
  if (plan === "hyper") return 3;
  if (plan === "core") return 2;
  return 1; // free
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
  // aceita q OU query (pra não quebrar links antigos)
  return (url.searchParams.get("q") || url.searchParams.get("query") || "").trim();
}

function renderCard(p) {
  const plan = getUserPlan();
  const userRank = planRank(plan);
  const required = planRank((p.tier || "free").toLowerCase());
  const locked = userRank < required;

  const badge = tierLabel(p.tier);
  const badgeHtml = badge ? `<span class="badge badge-tier">${badge}</span>` : "";

  const img = (p.images && p.images[0]) ? p.images[0] : "";
  const thumb = img
    ? `<div class="result-thumb"><img src="${img}" alt=""></div>`
    : `<div class="thumb-placeholder">Sem imagem</div>`;

  // FREE vê preço público; premium pode ver premium
  const price = plan === "free"
    ? formatBRL(p.pricePublic ?? p.pricePremium ?? 0)
    : formatBRL(p.pricePremium ?? p.pricePublic ?? 0);

  const actionHtml = locked
    ? `<a class="btn-outline full" href="assinatura.html">Desbloquear ofertas</a>`
    : `<a class="btn-primary" href="produto.html?id=${encodeURIComponent(p.id)}">Ver detalhes</a>`;

  const div = document.createElement("div");
  div.className = "result-card";
  div.innerHTML = `
    ${thumb}
    <div class="result-body">
      <div class="result-header">
        <h2>${p.title || "Produto"}</h2>
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

  // se não tem busca, chama o endpoint mesmo assim (pra mostrar lista)
  metaEl.textContent = q ? `Buscando: "${q}"…` : "Mostrando ofertas disponíveis…";

  try {
    const plan = getUserPlan();
    const url =
      `${API}/api/search` +
      `?q=${encodeURIComponent(q)}` +
      `&plan=${encodeURIComponent(plan)}` +
      `&page=1&limit=24`;

    const resp = await fetch(url);
    const data = await resp.json();

    const items = data.produtos || []; // ✅ aqui é a correção
    resultsGrid.innerHTML = "";

    metaEl.textContent = `${items.length} resultado(s)${q ? ` para "${q}"` : ""} • plano: ${plan}`;

    if (!items.length) {
      resultsGrid.innerHTML = `<div class="card-info">Nenhum resultado encontrado.</div>`;
      return;
    }

    items.forEach((p) => resultsGrid.appendChild(renderCard(p)));
  } catch (e) {
    console.error(e);
    metaEl.textContent = "Não consegui conectar no servidor agora.";
  }
}

runSearch();
