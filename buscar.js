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
  const n = Number(v);
  if (Number.isNaN(n)) return "Sob consulta";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ===============================
   IMAGEM (AGORA É ASSIM)
   - Se tiver p.image: usa
   - Se NÃO tiver: NÃO mostra imagem
================================ */
function getProductImage(p) {
  if (p?.image && String(p.image).trim() !== "") return String(p.image).trim();
  return null;
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

  const price =
    plan === "free"
      ? (p.pricePublic ?? p.pricePremium ?? p.price)
      : (p.pricePremium ?? p.pricePublic ?? p.price);

  const imgSrc = getProductImage(p);

  // monta a parte da imagem
  const imageHtml = imgSrc
    ? `<div class="card-image"><img src="${imgSrc}" alt="${p.title || ""}" loading="lazy"></div>`
    : `<div class="card-image no-image"></div>`;

  d.innerHTML = `
    ${imageHtml}

    <div class="card-body">
      <div class="card-title">
        ${p.title || ""}
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

  // se a imagem quebrar, some com ela (não troca por gpu nem nada)
  const imgEl = d.querySelector("img");
  if (imgEl) {
    imgEl.addEventListener("error", () => {
      const box = d.querySelector(".card-image");
      if (box) box.innerHTML = "";
      if (box) box.classList.add("no-image");
    });
  }

  return d;
}

/* ===============================
   LOAD SEARCH
================================ */
async function loadSearch() {
  meta.innerText = "Buscando produtos...";
  grid.innerHTML = "";

  const url = `${API}/api/search?q=${encodeURIComponent(q)}&plan=${encodeURIComponent(plan)}&page=1&limit=24`;

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
  meta.innerText = "Erro ao buscar produtos (veja o console).";
  grid.innerHTML = `<p>Falha ao carregar: ${err.message}</p>`;
});
