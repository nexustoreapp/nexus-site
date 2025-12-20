const API = "https://nexus-site-oufm.onrender.com";



/* ===============================
   ELEMENTOS BASE
================================ */
let grid = document.getElementById("results-grid");
let meta = document.getElementById("search-meta");

if (!meta) {
  meta = document.createElement("div");
  meta.id = "search-meta";
  document.body.prepend(meta);
}

if (!grid) {
  grid = document.createElement("div");
  grid.id = "results-grid";
  document.body.appendChild(grid);
}

/* ===============================
   PARAMS
================================ */
const params = new URLSearchParams(window.location.search);
const q = (params.get("q") || "").trim();
const plan = (localStorage.getItem("nexus_user_plan") || "free").toLowerCase();

const rank = { free: 1, core: 2, hyper: 3, omega: 4 };

/* ===============================
   UTIL
================================ */
function money(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function norm(s = "") {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function categoryFallback(category = "") {
  const c = norm(category);

  if (c.includes("headset")) return "/images/categories/headset.jpg";
  if (c.includes("teclad"))  return "/images/categories/teclado.jpg";
  if (c.includes("mouse"))   return "/images/categories/mouse.jpg";
  if (c.includes("monitor")) return "/images/categories/monitor.jpg";
  if (c.includes("notebook"))return "/images/categories/notebook.jpg";
  if (c.includes("placa") || c.includes("gpu") || c.includes("video")) return "/images/categories/gpu.jpg";
  if (c.includes("ram") || c.includes("memoria")) return "/images/categories/ram.jpg";
  if (c.includes("ssd")) return "/images/categories/ssd.jpg";

  return "/images/categories/default.jpg";
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

  // AQUI: como você não tem hs-001.jpg etc, a imagem é SEMPRE por categoria
  const imgSrc = categoryFallback(p.category);

  const price =
    plan === "free"
      ? (p.pricePublic ?? p.pricePremium)
      : (p.pricePremium ?? p.pricePublic);

  d.innerHTML = `
    <div class="card-image">
      <img src="${imgSrc}" alt="${p.title}">
    </div>

    <div class="card-body">
      <div class="card-title">
        ${p.title}
        <span class="badge-tier badge-${productTier}">
          ${productTier.toUpperCase()}
        </span>
      </div>

      <div class="card-subtitle">${p.subtitle || ""}</div>

      <div class="card-price">${money(price)}</div>

      <div class="card-action">
        ${
          locked
            ? `
              <div class="lock-overlay">Disponível no plano ${productTier.toUpperCase()}</div>
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
   LOAD SEARCH
================================ */
async function loadSearch() {
  meta.innerText = "Buscando produtos...";
  grid.innerHTML = "";

  const url = `${API}/api/search?q=${encodeURIComponent(q)}&plan=${plan}&page=1&limit=24`;

const r = await fetch(url);

if (!r.ok) {
  const txt = await r.text().catch(() => "");
  throw new Error(`API ${r.status}: ${txt}`);
}
  const data = await r.json();
  const produtos = data.produtos || [];

  meta.innerText = `${data.total ?? produtos.length} produto(s) encontrados`;

  if (!produtos.length) {
    grid.innerHTML = "<p>Nenhum produto encontrado.</p>";
    return;
  }

  produtos.forEach((p) => grid.appendChild(card(p)));
}

loadSearch().catch((err) => {
  console.error(err);
  meta.innerText = "Erro ao buscar produtos (veja o console).";
  grid.innerHTML = `<p>Falha ao carregar: ${err.message}</p>`;
});
