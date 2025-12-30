const API = "/api";

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
   LOAD SEARCH (V2 + LIVE)
================================ */
async function loadSearch() {
  try {
    meta.innerText = "Buscando produtos...";
    grid.innerHTML = "";

    // 1️⃣ Busca canônica (SKUs)
    const r = await fetch(`${API}/search?q=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error("Erro na busca");

    const data = await r.json();
    const produtos = data.products || [];

    if (!produtos.length) {
      meta.innerText = "Nenhum produto encontrado.";
      return;
    }

    // 2️⃣ Busca dados vivos
    const skus = produtos.map(p => p.sku);
    const r2 = await fetch(`${API}/live/get?skus=${skus.join(",")}`);
    const live = await r2.json();

    meta.innerText = `${live.items.length} produto(s) encontrados`;

    grid.innerHTML = "";

    live.items.forEach(p => {
      const card = document.createElement("div");
      card.className = "result-card";

      card.innerHTML = `
        <div class="card-image">
          <img src="${p.image || "/fallback.png"}" alt="${p.title}">
        </div>
        <div class="card-body">
          <div class="card-title">${p.title}</div>
          <div class="card-price">
            ${p.priceBRL ? "R$ " + p.priceBRL.toLocaleString("pt-BR") : "Sob consulta"}
          </div>
          <a href="${p.url}" target="_blank" class="btn-primary">
            Ver oferta
          </a>
        </div>
      `;

      grid.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    meta.innerText = "Erro ao buscar produtos";
  }
}

loadSearch();