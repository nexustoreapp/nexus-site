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
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function tierLabel(tier) {
  return String(tier || "free").toUpperCase();
}

/* ===============================
   IMAGENS (FALLBACK)
================================ */
// mapeia categoria -> imagem em /images/categories
function categoryImage(category = "") {
  const c = String(category).toLowerCase();

  // cuidado com acento: "Placa de Vídeo"
  if (c.includes("placa") || c.includes("vídeo") || c.includes("video") || c.includes("gpu")) return "/images/categories/gpu.jpg";
  if (c.includes("headset")) return "/images/categories/headset.jpg";
  if (c.includes("teclad")) return "/images/categories/teclado.jpg";
  if (c.includes("mouse")) return "/images/categories/mouse.jpg";
  if (c.includes("monitor")) return "/images/categories/monitor.jpg";
  if (c.includes("notebook")) return "/images/categories/notebook.jpg";
  if (c.includes("mem") || c.includes("ram")) return "/images/categories/ram.jpg";
  if (c.includes("ssd")) return "/images/categories/ssd.jpg";

  // genérico
  return "/images/categories/monitor.jpg";
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

  const imgPrimary = `/images/products/${p.id}.jpg`;
  const imgFallback = categoryImage(p.category);

  const price =
    plan === "free"
      ? (p.pricePublic ?? p.pricePremium)
      : (p.pricePremium ?? p.pricePublic);

  d.innerHTML = `
    <div class="card-image">
      <img
        src="${imgPrimary}"
        alt="${p.title}"
        loading="lazy"
        onerror="this.onerror=null; this.src='${imgFallback}'"
      />
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
                Disponível no plano ${tierLabel(productTier)}
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
   BUSCA + PAGINAÇÃO (base)
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

    if (!r.ok || data?.ok === false) {
      throw new Error(`API ${r.status} :: ${JSON.stringify(data)}`);
    }

    const produtos = data.produtos || [];
    meta.innerText = `${data.total ?? produtos.length} produto(s) encontrados`;

    if (!produtos.length) {
      grid.innerHTML = "<p>Nenhum produto encontrado.</p>";
      return;
    }

    produtos.forEach(p => grid.appendChild(card(p)));

  } catch (e) {
    console.error(e);
    meta.innerText = "Erro ao buscar produtos (veja o console).";
    grid.innerHTML = `<p>Falha ao carregar: ${String(e.message || e)}</p>`;
  }
})();