const API = window.NEXUS_API;

const grid = document.getElementById("results-grid");
const meta = document.getElementById("search-meta");

const priceFilter = document.getElementById("priceFilter");
const priceLabel = document.getElementById("priceLabel");
const categoryFilter = document.getElementById("categoryFilter");
const brandFilter = document.getElementById("brandFilter");

let allProducts = [];

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

  const filtered = allProducts.filter(p => {
    if (p.price > maxPrice) return false;
    if (category && p.category !== category) return false;
    if (brand && p.brand !== brand) return false;
    return true;
  });

  render(filtered);
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

/* ===============================
   INIT
================================ */
loadProducts();