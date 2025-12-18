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
   PLACEHOLDERS (fallback)
   -> usa /images/placeholders/*.jpg
================================ */
window.__nexusPH = (cat = "") => {
  const c = String(cat).toLowerCase();
  if (c.includes("headset")) return "/images/placeholders/headset.jpg";
  if (c.includes("teclad")) return "/images/placeholders/teclado.jpg";
  if (c.includes("mouse")) return "/images/placeholders/mouse.jpg";
  if (c.includes("monitor")) return "/images/placeholders/monitor.jpg";
  if (c.includes("notebook")) return "/images/placeholders/notebook.jpg";
  return "/images/placeholders/generic.jpg";
};

/* ===============================
   UTIL
================================ */
function money(v) {
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function tierLabel(tier) {
  return String(tier || "free").toUpperCase();
}

/* ===============================
   CARD
================================ */
function card(p) {
  const d = document.createElement("div");
  d.className = "result-card";

  const productTier = (p.tier || "free").toLowerCase();
  const locked = (rank[plan] ?? 1) < (rank[productTier] ?? 1);
  if (locked) d.classList.add("card-locked");

  // imagem real do produto (se existir) + fallback por categoria
  const imgPrimary = `/images/products/${p.id}.jpg`;
  const imgFallback = window.__nexusPH(p.category);

  const price =
    plan === "free" ? (p.pricePublic ?? p.pricePremium) : (p.pricePremium ?? p.pricePublic);

  d.innerHTML = `
    <div class="card-image">
      <img
        src="${imgPrimary}"
        alt="${p.title || "Produto"}"
        onerror="this.onerror=null; this.src='${imgFallback}';"
      />
    </div>

    <div class="card-body">
      <div class="card-title">
        ${p.title || ""}
        <span class="badge-tier badge-${productTier}">${tierLabel(productTier)}</span>
      </div>

      <div class="card-subtitle">${p.subtitle || ""}</div>

      <div class="card-price">${money(price)}</div>

      <div class="card-action">
        ${
          locked
            ? `
              <div class="lock-overlay">Disponível no plano ${tierLabel(productTier)}</div>
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

  const url =
    `${API}/api/search` +
    `?q=${encodeURIComponent(q)}` +
    `&plan=${encodeURIComponent(plan)}` +
    `&page=1&limit=24`;

  const r = await fetch(url);

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`API ${r.status} :: ${txt}`);
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
