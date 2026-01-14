const API = window.NEXUS_API;

const grid = document.getElementById("results-grid");
const meta = document.getElementById("search-meta");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");

const params = new URLSearchParams(window.location.search);
const q = (params.get("q") || "").trim().toLowerCase();

let currentPage = 1;
const PER_PAGE = 6;
let allProducts = [];

async function loadSearch() {
  meta.innerText = "Buscando produtos...";
  const r = await fetch(`${API}/products`);
  const d = await r.json();

  if (!d.ok) {
    meta.innerText = "Erro ao buscar produtos";
    return;
  }

  allProducts = d.products.filter(p =>
    p.title.toLowerCase().includes(q)
  );

  renderPage();
}

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
      <p>${p.price ? "R$ " + p.price.toLocaleString("pt-BR") : "Sob consulta"}</p>
      <a href="/produto/${p.slug}" class="btn-outline">Ver produto</a>
    `;

    grid.appendChild(card);
  });

  const totalPages = Math.ceil(allProducts.length / PER_PAGE);
  pageInfo.innerText = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

prevBtn.onclick = () => { currentPage--; renderPage(); };
nextBtn.onclick = () => { currentPage++; renderPage(); };

loadSearch();