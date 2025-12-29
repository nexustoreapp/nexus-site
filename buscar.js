const API = "https://nexus-site-oufm.onrender.com";

/* ===============================
   ELEMENTOS
================================ */
const grid = document.getElementById("results-grid");
const meta = document.getElementById("search-meta");

/* ===============================
   PARAMS
================================ */
const params = new URLSearchParams(window.location.search);
const q = (params.get("q") || "").trim();

/* ===============================
   CARD (CANÔNICO)
================================ */
function card(p) {
  const d = document.createElement("div");
  d.className = "result-card";

  d.innerHTML = `
    <div class="card-body">
      <div class="card-title">${p.sku}</div>
      <div class="card-category">${p.category}</div>

      <a class="btn-primary" href="produto.html?sku=${encodeURIComponent(
        p.sku
      )}">
        Ver produto
      </a>
    </div>
  `;

  return d;
}

/* ===============================
   LOAD SEARCH (V2)
================================ */
async function loadSearch() {
  meta.innerText = "Buscando produtos...";
  grid.innerHTML = "";

  const url = `${API}/api/search?q=${encodeURIComponent(q)}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error("Erro na busca");

  const data = await r.json();
  const produtos = data.products || [];

  meta.innerText = `${produtos.length} produto(s) encontrados`;

  if (!produtos.length) {
    grid.innerHTML = "<p>Nenhum produto encontrado.</p>";
    return;
  }

  produtos.forEach((p) => grid.appendChild(card(p)));
}

loadSearch().catch((err) => {
  console.error(err);
  meta.innerText = "Erro ao buscar produtos";
});
