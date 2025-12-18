const API = "https://nexus-site-oufm.onrender.com";

/* ===============================
   ELEMENTOS BASE
================================ */
let pageRoot = document.getElementById("search-page");

if (!pageRoot) {
  pageRoot = document.createElement("div");
  pageRoot.id = "search-page";
  document.body.appendChild(pageRoot);
}

let meta = document.getElementById("search-meta");
if (!meta) {
  meta = document.createElement("div");
  meta.id = "search-meta";
}

const layout = document.createElement("div");
layout.id = "search-layout";

const sidebar = document.createElement("aside");
sidebar.id = "search-filters";

const main = document.createElement("main");
main.id = "search-main";

let grid = document.getElementById("results-grid");
if (!grid) {
  grid = document.createElement("div");
  grid.id = "results-grid";
}

main.appendChild(meta);
main.appendChild(grid);

layout.appendChild(sidebar);
layout.appendChild(main);

pageRoot.innerHTML = "";
pageRoot.appendChild(layout);

/* ===============================
   PARAMS
================================ */
const params = new URLSearchParams(window.location.search);
const q = (params.get("q") || "").trim();
const plan = (localStorage.getItem("nexus_user_plan") || "free").toLowerCase();

const rank = { free: 1, core: 2, hyper: 3, omega: 4 };

const catMap = {
  "Mouse": "mouse",
  "Headset": "headset",
  "Teclado": "teclado",
  "Placa de Vídeo": "gpu",
  "Monitor": "monitor",
  "Notebook": "notebook",
  "SSD": "ssd",
  "Memória RAM": "ram",
};

/* ===============================
   STATE
================================ */
const state = {
  category: "",
  brand: "",
  tier: "",
  priceMin: "",
  priceMax: ""
};

let page = 1;
const limit = 24;
let total = 0;
let totalPages = 1;
let loading = false;
let facetsCache = null;

const loader = document.createElement("div");
loader.id = "scroll-loader";
loader.style.textAlign = "center";
loader.style.opacity = "0.9";
loader.style.padding = "10px 0";
loader.innerText = "Carregando...";

const sentinel = document.createElement("div");
sentinel.id = "scroll-sentinel";
sentinel.style.height = "40px";

/* ===============================
   UTIL
================================ */
function money(v) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function tierLabel(tier) {
  return (tier || "free").toUpperCase();
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

/* ===============================
   CARD
================================ */
function card(p) {
  const d = document.createElement("div");
  d.className = "result-card";

  const productTier = (p.tier || "free").toLowerCase();
  const locked = (rank[plan] || 1) < (rank[productTier] || 1);
  if (locked) d.classList.add("card-locked");

  const catKey = catMap[p.category] || "mouse";
  const imgMain = `images/products/${p.id}.jpg`;
  const imgFallback = `images/categories/${catKey}.jpg`;

  const price =
    plan === "free" ? (p.pricePublic ?? p.pricePremium) : (p.pricePremium ?? p.pricePublic);

  d.innerHTML = `
    <div class="card-image">
      <img
        src="${imgMain}"
        alt="${esc(p.title)}"
        loading="lazy"
        onerror="this.onerror=null; this.src='${imgFallback}';"
      >
    </div>

    <div class="card-body">
      <div class="card-title">
        ${esc(p.title)}
        <span class="badge-tier badge-${productTier}">
          ${tierLabel(productTier)}
        </span>
      </div>

      <div class="card-subtitle">${esc(p.subtitle || "")}</div>

      <div class="card-price">${money(price)}</div>

      <div class="card-action">
        ${
          locked
            ? `
              <div class="lock-overlay">
                Disponível no plano ${productTier.toUpperCase()}
              </div>
              <a href="assinatura.html" class="btn-outline">Desbloquear</a>
            `
            : `
              <a href="produto.html?id=${encodeURIComponent(p.id)}" class="btn-primary">Ver produto</a>
            `
        }
      </div>
    </div>
  `;
  return d;
}

/* ===============================
   API
================================ */
function buildUrl(nextPage) {
  const u = new URL(`${API}/api/search`);
  u.searchParams.set("q", q);
  u.searchParams.set("plan", plan);
  u.searchParams.set("page", String(nextPage));
  u.searchParams.set("limit", String(limit));

  if (state.category) u.searchParams.set("category", state.category);
  if (state.brand) u.searchParams.set("brand", state.brand);
  if (state.tier) u.searchParams.set("tier", state.tier);
  if (state.priceMin) u.searchParams.set("priceMin", state.priceMin);
  if (state.priceMax) u.searchParams.set("priceMax", state.priceMax);

  return u.toString();
}

async function fetchPage(nextPage) {
  const r = await fetch(buildUrl(nextPage));
  return r.json();
}

/* ===============================
   FILTER UI
================================ */
function buildSelect(label, key, options, placeholder = "Todos") {
  const wrap = document.createElement("div");
  wrap.className = "filter-block";

  const h = document.createElement("div");
  h.className = "filter-label";
  h.innerText = label;

  const select = document.createElement("select");
  select.className = "filter-select";
  select.innerHTML = `<option value="">${placeholder}</option>` +
    options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join("");

  select.value = state[key] || "";

  select.onchange = () => {
    state[key] = select.value;
    resetAndLoad();
  };

  wrap.appendChild(h);
  wrap.appendChild(select);
  return wrap;
}

function buildPriceRange(minV, maxV) {
  const wrap = document.createElement("div");
  wrap.className = "filter-block";

  const h = document.createElement("div");
  h.className = "filter-label";
  h.innerText = "Faixa de preço";

  const row = document.createElement("div");
  row.className = "price-row";

  const iMin = document.createElement("input");
  iMin.type = "number";
  iMin.placeholder = `Min (${minV ?? ""})`;
  iMin.value = state.priceMin || "";

  const iMax = document.createElement("input");
  iMax.type = "number";
  iMax.placeholder = `Max (${maxV ?? ""})`;
  iMax.value = state.priceMax || "";

  const btn = document.createElement("button");
  btn.className = "btn-outline";
  btn.innerText = "Aplicar";
  btn.onclick = () => {
    state.priceMin = iMin.value ? String(iMin.value) : "";
    state.priceMax = iMax.value ? String(iMax.value) : "";
    resetAndLoad();
  };

  row.appendChild(iMin);
  row.appendChild(iMax);
  wrap.appendChild(h);
  wrap.appendChild(row);
  wrap.appendChild(btn);
  return wrap;
}

function renderSidebar(facets) {
  sidebar.innerHTML = `
    <div class="filters-head">
      <div class="filters-title">Filtrar</div>
      <button class="btn-outline" id="clear-filters">Limpar</button>
    </div>
  `;

  const cats = Object.keys(facets.categories || {}).sort((a,b)=>a.localeCompare(b));
  const brands = Object.keys(facets.brands || {}).sort((a,b)=>a.localeCompare(b));
  const tiers = Object.keys(facets.tiers || {}).map(t => t.toLowerCase());

  sidebar.appendChild(buildSelect("Categoria", "category", cats));
  sidebar.appendChild(buildSelect("Marca", "brand", brands));
  sidebar.appendChild(buildSelect("Plano do produto", "tier", tiers, "Todos (do seu plano pra baixo)"));
  sidebar.appendChild(buildPriceRange(facets.priceMin, facets.priceMax));

  const clearBtn = sidebar.querySelector("#clear-filters");
  clearBtn.onclick = () => {
    state.category = "";
    state.brand = "";
    state.tier = "";
    state.priceMin = "";
    state.priceMax = "";
    resetAndLoad();
  };
}

/* ===============================
   LOAD
================================ */
function resetAndLoad() {
  page = 1;
  total = 0;
  totalPages = 1;
  grid.innerHTML = "";
  grid.appendChild(sentinel);
  loadMore(true);
}

async function loadMore(isReset = false) {
  if (loading) return;
  if (page > totalPages) return;

  loading = true;
  grid.appendChild(loader);

  try {
    const data = await fetchPage(page);

    const produtos = data.produtos || [];
    total = data.total ?? total;
    totalPages = data.totalPages ?? totalPages;

    // facets só no primeiro load/reset
    if (isReset || !facetsCache) {
      facetsCache = data.facets || facetsCache;
      if (facetsCache) renderSidebar(facetsCache);
    }

    meta.innerText = `${Math.min(page * limit, total)} de ${total} produto(s)`;

    if (page === 1 && !produtos.length) {
      grid.innerHTML = "<p>Nenhum produto encontrado com esses filtros.</p>";
      return;
    }

    produtos.forEach(p => grid.appendChild(card(p)));
    page += 1;

    if (page > totalPages) {
      loader.remove();
      const end = document.createElement("div");
      end.className = "end-results";
      end.innerText = "Fim dos resultados.";
      grid.appendChild(end);
    }
  } catch (e) {
    console.error(e);
    meta.innerText = "Erro ao carregar.";
  } finally {
    loading = false;
  }
}

/* init */
meta.innerText = "Buscando...";
grid.innerHTML = "";
grid.appendChild(sentinel);
loadMore(true);

/* scroll */
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadMore(false);
  }, { rootMargin: "700px" });
  io.observe(sentinel);
}
