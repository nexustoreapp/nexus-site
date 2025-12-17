// buscar.js
const metaEl = document.getElementById("search-meta");
const gridEl = document.getElementById("results-grid");

const API = window.NEXUS_API || "https://nexus-site-oufm.onrender.com";

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name) || "";
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showError(msg) {
  metaEl.textContent = msg;
  gridEl.innerHTML = "";
}

function renderResults(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    showError("Não encontrei resultados pra essa busca. Tenta ajustar o termo.");
    return;
  }

  gridEl.innerHTML = items
    .map((p) => {
      const id = p.id || p.productId || p.sku || "";
      const title = p.title || p.name || "Produto";
      const store = p.store || p.shop || "";
      const img = p.image || p.thumbnail || "";
      const price = p.priceFinal ?? p.price ?? p.value ?? "";
      const priceOld = p.priceOld ?? p.originalPrice ?? "";

      const imgBlock = img
        ? `<div class="result-thumb"><img src="${escapeHtml(img)}" alt="${escapeHtml(title)}"/></div>`
        : `<div class="result-thumb"><div class="thumb-placeholder">Sem imagem</div></div>`;

      const priceLine =
        price !== ""
          ? `<div class="result-prices">
              <div class="price-current">R$ ${escapeHtml(String(price))}</div>
              ${priceOld !== "" ? `<div class="price-original">R$ ${escapeHtml(String(priceOld))}</div>` : ""}
            </div>`
          : `<div class="result-prices"><div class="price-current">Preço indisponível</div></div>`;

      const goLink = id ? `produto.html?id=${encodeURIComponent(id)}` : `produto.html`;

      return `
        <article class="result-card">
          ${imgBlock}
          <div class="result-body">
            <div class="result-header">
              <h2>${escapeHtml(title)}</h2>
            </div>
            ${store ? `<div class="result-store">${escapeHtml(store)}</div>` : ""}
            ${priceLine}
            <div class="result-actions">
              <a class="btn-outline full" href="${goLink}">Ver produto</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

async function run() {
  const q = getQueryParam("q") || getQueryParam("query") || "";
  const plan = (window.getNexusPlan && window.getNexusPlan()) || "free";

  if (!q) {
    showError("Nenhuma busca encontrada. Volte e pesquise um termo.");
    return;
  }

  metaEl.textContent = `Buscando por: “${q}”…`;

  try {
    // ✅ tenta endpoint padrão
    let resp = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}&plan=${encodeURIComponent(plan)}`);

    // ✅ fallback (caso seu backend esteja em /search)
    if (!resp.ok) {
      resp = await fetch(`${API}/api/search/${encodeURIComponent(q)}?plan=${encodeURIComponent(plan)}`);
    }

    if (!resp.ok) {
      showError("Não foi possível conectar ao servidor da Nexus. Verifique se o backend está rodando.");
      return;
    }

    const data = await resp.json();

    if (!data || data.ok === false) {
      showError("A busca falhou agora. Tenta novamente em instantes.");
      return;
    }

    const items =
      data.items ||
      data.products ||
      data.results ||
      data.data ||
      [];

    metaEl.textContent = `Resultados para: “${q}”`;
    renderResults(items);
  } catch (e) {
    console.error("BUSCAR ERROR:", e);
    showError("Não foi possível conectar ao servidor da Nexus. Verifique se o backend está rodando.");
  }
}

run();
