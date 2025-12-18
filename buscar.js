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
   MAPA DE CATEGORIA -> ARQUIVO
   (precisa existir em /images/categories/)
================================ */
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
   UTIL
================================ */
function money(v) {
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function tierLabel(tier) {
  return (tier || "free").toUpperCase();
}

/* ===============================
   CARD
================================ */
function card(p) {
  const d = document.createElement("div");
  d.className = "result-card";

  const productTier = (p.tier || "free").toLowerCase();
  const locked = rank[plan] < rank[productTier];

  if (locked) d.classList.add("card-locked");

  // imagem principal por ID + fallback por categoria
  const catKey = catMap[p.category] || "mouse";
  const imgMain = `/images/products/${p.id}.jpg`;
  const imgFallback = `/images/categories/${catKey}.jpg`;

  const price =
    plan === "free"
      ? (p.pricePublic ?? p.pricePremium)
      : (p.pricePremium ?? p.pricePublic);

  d.innerHTML = `
    <div class="card-image">
      <img
        src="${imgMain}"
        alt="${p.title}"
        loading="lazy"
        onerror="this.onerror=null; this.src='${imgFallback}';"
      >
    </div>

    <div class="card-body">
      <div class="card-title">
        ${p.title}
        <span class="badge-tier badge-${productTier}">
          ${tierLabel(productTier)}
        </span>
      </div>

      <div class="card-subtitle">
        ${p.subtitle || ""}
      </div>

      <div class="card-price">
        ${money(price)}
      </div>

      <div class="card-action">
        ${
          locked
            ? `
              <div class="lock-overlay">
                Disponível no plano ${productTier.toUpperCase()}
              </div>
              <a href="assinatura.html" class="btn-outline">
                Desbloquear
              </a>
            `
            : `
              <a href="produto.html?id=${p.id}" class="btn-primary">
                Ver produto
              </a>
            `
        }
      </div>
    </div>
  `;

  return d;
}

/* ===============================
   BUSCA
================================ */
(async () => {
  meta.innerText = "Buscando produtos...";
  grid.innerHTML = "";

  try {
    const url =
      `${API}/api/search` +
      `?q=${encodeURIComponent(q)}` +
      `&plan=${encodeURIComponent(plan)}` +
      `&page=1&limit=24`;

    const r = await fetch(url);
    const data = await r.json();

    const produtos = data.produtos || [];

    meta.innerText = `${produtos.length} produto(s) encontrados`;

    if (!produtos.length) {
      grid.innerHTML = "<p>Nenhum produto encontrado.</p>";
      return;
    }

    produtos.forEach(p => grid.appendChild(card(p)));

  } catch (e) {
    console.error(e);
    meta.innerText = "Erro ao conectar ao servidor.";
  }
})();
