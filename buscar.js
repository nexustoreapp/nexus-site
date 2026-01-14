const API = window.NEXUS_API;

const grid = document.getElementById("results-grid");
const meta = document.getElementById("search-meta");

const priceFilter = document.getElementById("priceFilter");
const priceLabel = document.getElementById("priceLabel");
const categoryFilter = document.getElementById("categoryFilter");
const brandFilter = document.getElementById("brandFilter");
const sortSelect = document.getElementById("sortSelect");

let allProducts = [];
let filteredProducts = [];

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

  applySort();
}

/* ===============================
   ORDENAÇÃO
================================ */
function applySort() {
  const sort = sortSelect.value;

  const list = [...filteredProducts];

  if (sort === "price-asc") {
    list.sort((a, b) => a.price - b.price);
  }

  if (sort === "price-desc") {
    list.sort((a, b) => b.price - a.price);
  }

  // relevance = ordem natural (mock)
  render(list);
}

/* ===============================
   RENDER
================================ */
function render(list) {
  grid.innerHTML = "";
  meta.innerText = `${list.length} produto(s) encontrados`;

  if (list.length === 0) {
    grid.innerHTML = "<p>Nenhum produto encontrado.</p>";
    return;
  }

  list.forEach(p => {
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