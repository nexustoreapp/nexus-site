const API = window.NEXUS_API;

/* ===============================
   ELEMENTOS
================================ */
const grid = document.getElementById("results-grid");
const meta = document.getElementById("search-meta");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");

/* ===============================
   PARAMS
================================ */
const params = new URLSearchParams(window.location.search);
const q = (params.get("q") || "").trim().toLowerCase();

/* ===============================
   PAGINAÇÃO
================================ */
let currentPage = 1;
const PER_PAGE = 6;
let allProducts = [];

/* ===============================
   LOAD SEARCH
================================ */
async function loadSearch() {
  try {
    meta.innerText = "Buscando produtos...";
    grid.innerHTML = "";

    const r = await fetch(`${API}/shopify/products?limit=100`);
    const data = await r.json();

    if (!data.ok) {
      meta.innerText = "Erro ao buscar produtos";
      return;
    }

    allProducts = (data.products || []).filter(p =>
      p.title.toLowerCase().includes(q)
    );

    if (allProducts.length === 0) {
      meta.innerText = "Nenhum produto encontrado";
      return;
    }

    renderPage();
  } catch (err) {
    console.error(err);
    meta.innerText = "Erro ao buscar produtos";
  }
}

/* ===============================
   RENDER PAGE
================================ */
function renderPage() {
  grid.innerHTML = "";

  const start = (currentPage - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  const pageItems = allProducts.slice(start, end);

  pageItems.forEach(p => {
    const card = document.createElement("div");
    card.className = "result-card";

    card.innerHTML = `
      <h3>${p.title}</h3>
      <p class="price">
        ${p.price ? "R$ " + p.price.toLocaleString("pt-BR") : "Sob consulta"}
      </p>
      <a href="produto.html?handle=${encodeURIComponent(p.handle)}" class="btn-outline">
        Ver produto
      </a>
    `;

    grid.appendChild(card);
  });

  const totalPages = Math.ceil(allProducts.length / PER_PAGE);

  meta.innerText = `${allProducts.length} produto(s) encontrados`;
  pageInfo.innerText = `Página ${currentPage} de ${totalPages}`;

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

/* ===============================
   CONTROLES
================================ */
prevBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
  }
};

nextBtn.onclick = () => {
  const totalPages = Math.ceil(allProducts.length / PER_PAGE);
  if (currentPage < totalPages) {
    currentPage++;
    renderPage();
  }
};

/* ===============================
   INIT
================================ */
loadSearch();