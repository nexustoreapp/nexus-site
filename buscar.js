// buscar.js
const API = window.NEXUS_API;

const grid = document.getElementById("results-grid");
const meta = document.getElementById("search-meta");

let page = 1;
let loading = false;
let finished = false;

async function loadProducts() {
  if (loading || finished) return;

  loading = true;
  meta.innerText = "Carregando produtos...";

  const r = await fetch(`${API}/products?page=${page}`);
  const data = await r.json();

  if (!data.ok || !data.products.length) {
    finished = true;
    meta.innerText = "Nenhum outro produto.";
    return;
  }

  data.products.forEach(p => {
    const card = document.createElement("div");
    card.className = "result-card";

    card.innerHTML = `
      <h3>${p.title}</h3>
      <p>${p.description || ""}</p>
      <a href="produto.html?id=${p.id}" class="btn-outline">
        Ver produto
      </a>
    `;

    grid.appendChild(card);
  });

  page++;
  loading = false;
  meta.innerText = "";
}

// Lazy load ao rolar
window.addEventListener("scroll", () => {
  if (
    window.innerHeight + window.scrollY >=
    document.body.offsetHeight - 200
  ) {
    loadProducts();
  }
});

// Primeira carga
loadProducts();