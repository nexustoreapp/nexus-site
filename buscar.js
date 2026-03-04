// buscar.js
const API = window.NEXUS_API;

const grid = document.getElementById("results-grid");
const meta = document.getElementById("search-meta");

let page = 1;
let loading = false;
let finished = false;

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadProducts() {
  if (loading || finished) return;
  loading = true;
  if (meta) meta.innerText = "Carregando produtos...";

  try {
    const r = await fetch(`${API}/products?page=${page}`);
    const data = await r.json().catch(() => null);

    const products = data?.products || [];
    if (!data?.ok || products.length === 0) {
      finished = true;
      if (meta) meta.innerText = page === 1 ? "Nenhum produto encontrado." : "Nenhum outro produto.";
      loading = false;
      return;
    }

    products.forEach(p => {
      const card = document.createElement("div");
      card.className = "card product col-4";

      card.innerHTML = `
        <div class="thumb"></div>
        <div class="body">
          <div class="title">${escapeHtml(p.title || "Produto")}</div>
          <div class="helper" style="margin-top:6px;">${escapeHtml(p.description || "")}</div>

          <div class="row">
            <a class="btn btn-outline" href="produto.html?id=${encodeURIComponent(p.id)}">Ver produto</a>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });

    page++;
    if (meta) meta.innerText = "";
  } catch (e) {
    if (meta) meta.innerText = "Erro ao carregar produtos. Tente novamente.";
  } finally {
    loading = false;
  }
}

// Lazy load ao rolar
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 220) {
    loadProducts();
  }
});

// Primeira carga
loadProducts();