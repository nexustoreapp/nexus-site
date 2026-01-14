const API = window.NEXUS_API;

const grid = document.getElementById("results-grid");
const meta = document.getElementById("search-meta");
const pagination = document.getElementById("pagination");

const priceFilter = document.getElementById("priceFilter");
const priceLabel = document.getElementById("priceLabel");
const categoryFilter = document.getElementById("categoryFilter");
const brandFilter = document.getElementById("brandFilter");
const sortSelect = document.getElementById("sortSelect");

let allProducts = [];
let filteredProducts = [];

/* ===============================
   PAGINAÇÃO
================================ */
const PER_PAGE = 8;
let currentPage = 1;

/* ===============================
   LOAD
================================ */
async function loadProducts() {
  meta.innerText = "Buscando produtos...";
  grid.innerHTML = "";

  const r = await fetch(`${API}/products`);
  const d = await r.json();

  if (!d.ok) {
    meta.innerText = "Erro ao buscar produtos";
    return;
  }

  allProducts = d.products;
  applyFilters();
}

/* ===============================
   FILTROS
================================ */
function applyFilters() {
  const maxPrice = Number(priceFilter.value || 20000);
  const category = categoryFilter.value;
  const brand = brandFilter.value;

  priceLabel.innerText = `Até R$ ${maxPrice.toLocaleString("pt-BR")}`;

  filteredProducts = allProducts.filter(p => {
    if (p.price > maxPrice) return false;
    if (category && p.category !== category) return false;
    if (brand && p.brand !== brand) return false;
    return true;
  });

  currentPage = 1;
  applySort();
}

/* ===============================
   ORDENAÇÃO
================================ */
function applySort() {
  const sort = sortSelect.value;

  if (sort === "price-asc") {
    filteredProducts.sort((a, b) => a.price - b.price);
  }

  if (sort === "price-desc") {
    filteredProducts.sort((a, b) => b.price - a.price);
  }

  render();
}

/* ===============================
   RENDER
================================ */
function render() {
  grid.innerHTML = "";
  pagination.innerHTML = "";

  const total = filteredProducts.length;
  const totalPages = Math.ceil(total / PER_PAGE);

  meta.innerText = `${total} produto(s) encontrados`;

  if (total === 0) {
    grid.innerHTML = "<p>Nenhum produto encontrado.</p>";
    return;
  }

  const start = (currentPage - 1) * PER_PAGE;
  const end = start + PER_PAGE;
  const pageItems = filteredProducts.slice(start, end);

  pageItems.forEach(p => {
    const card = document.createElement("div");
    card.className = "result-card";

    card.innerHTML = `
      <h3>${p.title}</h3>
      <p>${p.brand} • ${p.category}</p>
      <strong>R$ ${p.price.toLocaleString("pt-BR")}</strong>
      <a href="produto.html?id=${p.id}" class="btn-outline">Ver produto</a>
    `;

    grid.appendChild(card);
  });

  renderPagination(totalPages);
}

/* ===============================
   PAGINATION UI
================================ */
function renderPagination(totalPages) {
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.innerText = i;
    btn.className = "page-btn";
    if (i === currentPage) btn.classList.add("active");

    btn.onclick = () => {
      currentPage = i;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    pagination.appendChild(btn);
  }
}

/* ===============================
   EVENTS
================================ */
priceFilter.oninput = applyFilters;
categoryFilter.onchange = applyFilters;
brandFilter.onchange = applyFilters;
sortSelect.onchange = applySort;

/* ===============================
   INIT
================================ */
loadProducts();