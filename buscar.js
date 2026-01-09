const API = window.NEXUS_API;

/* ===============================
   ELEMENTOS
================================ */
const grid = document.getElementById("results-grid");
const meta = document.getElementById("search-meta");

/* ===============================
   PARAMS
================================ */
const params = new URLSearchParams(window.location.search);
const q = (params.get("q") || "").trim().toLowerCase();

/* ===============================
   LOAD SEARCH (SHOPIFY)
================================ */
async function loadSearch() {
  try {
    if (!grid || !meta) return;

    meta.innerText = "Buscando produtos...";
    grid.innerHTML = "";

    const r = await fetch(`${API}/shopify/products?limit=50`);
    const data = await r.json();

    if (!data.ok) {
      meta.innerText = "Erro ao buscar produtos";
      return;
    }

    const produtos = (data.products || []).filter(p =>
      p.title.toLowerCase().includes(q)
    );

    meta.innerText = `${produtos.length} produto(s) encontrados`;

    if (produtos.length === 0) {
      grid.innerHTML = "<p>Nenhum produto encontrado.</p>";
      return;
    }

    produtos.forEach(p => {
      const card = document.createElement("div");
      card.className = "result-card";

      card.innerHTML = `
        <div class="card-image">
          <img src="${p.image || "fallback.png"}" alt="${p.title}">
        </div>

        <div class="card-body">
          <div class="card-title">${p.title}</div>

          <div class="card-price">
            ${p.price ? "R$ " + p.price.toLocaleString("pt-BR") : "Sob consulta"}
          </div>

          <a href="produto.html?handle=${encodeURIComponent(p.handle)}" class="btn-primary">
            Ver produto
          </a>
        </div>
      `;

      grid.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    if (meta) meta.innerText = "Erro ao buscar produtos";
  }
}

loadSearch();