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
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  const locked = (rank[plan] || 1) < (rank[productTier] || 1);
  if (locked) d.classList.add("card-locked");

  const catKey = catMap[p.category] || "mouse";

  // ⚠️ caminhos RELATIVOS (evita bug de host puxar logo)
  const imgMain = `images/products/${p.id}.jpg`;
  const imgFallback = `images/categories/${catKey}.jpg`;

  const price =
    plan === "free" ? (p.pricePublic ?? p.pricePremium) : (p.pricePremium ?? p.pricePublic);

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

      <div class="card-subtitle">${p.subtitle || ""}</div>

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
              <a href="produto.html?id=${p.id}" class="btn-primary">Ver produto</a>
            `
        }
      </div>
    </div>
  `;
  return d;
}

/* ===============================
   SCROLL INFINITO (PAGINAÇÃO)
================================ */
let page = 1;
const limit = 24;
let total = 0;
let totalPages = 1;
let loading = false;

const sentinel = document.createElement("div");
sentinel.id = "scroll-sentinel";
sentinel.style.height = "40px";

const loader = document.createElement("div");
loader.id = "scroll-loader";
loader.style.textAlign = "center";
loader.style.opacity = "0.9";
loader.style.padding = "10px 0";
loader.innerText = "Carregando mais produtos...";

async function fetchPage(nextPage) {
  const url =
    `${API}/api/search` +
    `?q=${encodeURIComponent(q)}` +
    `&plan=${encodeURIComponent(plan)}` +
    `&page=${nextPage}&limit=${limit}`;

  const r = await fetch(url);
  const data = await r.json();
  return data;
}

async function loadMore() {
  if (loading) return;
  if (page > totalPages) return;

  loading = true;
  grid.appendChild(loader);

  try {
    const data = await fetchPage(page);

    const produtos = data.produtos || [];
    total = data.total ?? total;
    totalPages = data.totalPages ?? totalPages;

    // meta
    meta.innerText = `${Math.min(page * limit, total)} de ${total} produto(s) carregados`;

    if (page === 1 && !produtos.length) {
      grid.innerHTML = "<p>Nenhum produto encontrado.</p>";
      return;
    }

    produtos.forEach(p => grid.appendChild(card(p)));

    page += 1;

    // se acabou, remove loader
    if (page > totalPages) {
      loader.remove();
      const end = document.createElement("div");
      end.style.textAlign = "center";
      end.style.opacity = "0.7";
      end.style.padding = "14px 0";
      end.innerText = "Fim dos resultados.";
      grid.appendChild(end);
    }
  } catch (e) {
    console.error(e);
    meta.innerText = "Erro ao carregar mais produtos.";
  } finally {
    loading = false;
  }
}

// inicial
meta.innerText = "Buscando produtos...";
grid.innerHTML = "";
grid.appendChild(sentinel);
loadMore();

// observa o final pra carregar automaticamente
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    const first = entries[0];
    if (first.isIntersecting) loadMore();
  }, { rootMargin: "600px" });

  io.observe(sentinel);
} else {
  // fallback: botão
  const btn = document.createElement("button");
  btn.innerText = "Carregar mais";
  btn.className = "btn-primary";
  btn.style.display = "block";
  btn.style.margin = "14px auto";
  btn.onclick = loadMore;
  grid.appendChild(btn);
}
