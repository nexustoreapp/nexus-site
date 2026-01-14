const API = window.NEXUS_API;

const grid = document.getElementById("results-grid");
const meta = document.getElementById("search-meta");
const pagination = document.getElementById("pagination");

const priceFilter = document.getElementById("priceFilter");
const priceLabel = document.getElementById("priceLabel");
const categoryFilter = document.getElementById("categoryFilter");
const brandFilter = document.getElementById("brandFilter");
const sortSelect = document.getElementById("sortSelect");

const params = new URLSearchParams(window.location.search);

let allProducts = [];
let filteredProducts = [];

const PER_PAGE = 8;
let currentPage = Number(params.get("page")) || 1;

/* ===============================
   INIT FROM URL
================================ */
priceFilter.value = params.get("price") || 20000;
categoryFilter.value = params.get("category") || "";
brandFilter.value = params.get("brand") || "";
sortSelect.value = params.get("sort") || "relevance";

/* ===============================
   LOAD
================================ */
async function loadProducts() {
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
   URL UPDATE
================================ */
function updateURL() {
  const qs = new URLSearchParams({
    price: priceFilter.value,
    category: categoryFilter.value,
    brand: brandFilter.value,
    sort: sortSelect.value,
    page: currentPage
  });

  history.replaceState(null, "", "buscar.html?" + qs.toString());
}

/* ===============================
   FILTER
================================ */
function applyFilters() {
  const maxPrice = Number(priceFilter.value);
  priceLabel.innerText = `Até R$ ${maxPrice.toLocaleString("pt-BR")}`;

  filteredProducts = allProducts.filter(p => {
    if (p.price > maxPrice) return false;
    if (categoryFilter.value && p.category !== categoryFilter.value) return false;
    if (brandFilter.value && p.brand !== brandFilter.value) return false;
    return true;
  });

  currentPage = 1;
  applySort();
}

/* ===============================
   SORT
================================ */
function applySort() {
  if (sortSelect.value === "price-asc")
    filteredProducts.sort((a,b)=>a.price-b.price);

  if (sortSelect.value === "price-desc")
    filteredProducts.sort((a,b)=>b.price-a.price);

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

  const start = (currentPage - 1) * PER_PAGE;
  const pageItems = filteredProducts.slice(start, start + PER_PAGE);

  pageItems.forEach(p => {
    grid.innerHTML += `
      <div class="result-card">
        <h3>${p.title}</h3>
        <p>${p.brand} • ${p.category}</p>
        <strong>R$ ${p.price.toLocaleString("pt-BR")}</strong>
        <a href="produto.html?id=${p.id}" class="btn-outline">Ver produto</a>
      </div>
    `;
  });

  for (let i = 1; i <= totalPages; i++) {
    const b = document.createElement("button");
    b.innerText = i;
    if (i === currentPage) b.classList.add("active");

    b.onclick = () => {
      currentPage = i;
      updateURL();
      render();
      window.scrollTo({ top:0, behavior:"smooth" });
    };

    pagination.appendChild(b);
  }

  updateURL();
  updateSEO(total);
}

/* ===============================
   SEO DINÂMICO
================================ */
function updateSEO(total) {
  document.title = `Buscar (${total}) — Nexus`;

  const desc = document.querySelector("meta[name='description']");
  desc.content = `Encontramos ${total} produtos tech no Nexus. Compare preços e planos.`;
}

/* ===============================
   EVENTS
================================ */
priceFilter.oninput = applyFilters;
categoryFilter.onchange = applyFilters;
brandFilter.onchange = applyFilters;
sortSelect.onchange = applySort;

/* ===============================
   START
================================ */
loadProducts();