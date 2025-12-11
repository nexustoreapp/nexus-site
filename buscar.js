// buscar.js

// Formata número como preço em R$ (pt-BR)
function formatPrice(valor) {
  if (typeof valor !== "number") return "-";
  return valor.toFixed(2).replace(".", ",");
}

// Monta o textozinho em cima da página
function atualizarMetaBusca(termo, total) {
  const metaEl = document.getElementById("search-meta");
  if (!metaEl) return;

  if (!termo) {
    metaEl.textContent = `Mostrando ${total} produto(s) do catálogo Nexus.`;
  } else {
    metaEl.textContent = `Você buscou por “${termo}” — encontramos ${total} produto(s) no catálogo Nexus.`;
  }
}

// Monta os cards de resultado
function renderizarResultados(data) {
  const grid = document.getElementById("results-grid");
  if (!grid) return;

  grid.innerHTML = "";

  const resultados = data?.results || [];
  const termo = data?.query || "";

  atualizarMetaBusca(termo, resultados.length);

  if (!resultados.length) {
    grid.innerHTML = `
      <p class="no-results">
        Não encontramos nenhum produto Nexus para “${termo}”.
        <br />
        Tenta usar outro termo ou categoria (ex: monitor, teclado, mouse, headset).
      </p>
    `;
    return;
  }

  resultados.forEach((item) => {
    const card = document.createElement("article");
    card.className = "result-card";

    const imgSrc = item.images && item.images.length ? item.images[0] : "logo.png";

    const precoPublic = item.pricePublic;
    const precoPremium = item.pricePremium;

    const precoPublicHtml = precoPublic
      ? `<span class="price-public">R$ ${formatPrice(precoPublic)}</span>`
      : "";

    const precoPremiumHtml = precoPremium
      ? `<span class="price-premium">R$ ${formatPrice(precoPremium)} <span class="price-premium-badge">Nexus+</span></span>`
      : "";

    const flags = [];
    if (item.premiumOnly) {
      flags.push(`<span class="flag flag-premium">Exclusivo Nexus+</span>`);
    }
    if (item.omegaExclusive) {
      flags.push(`<span class="flag flag-omega">Omega Exclusive</span>`);
    }

    card.innerHTML = `
      <div class="result-image">
        <img src="${imgSrc}" alt="${item.title}" />
      </div>
      <div class="result-info">
        <h3 class="result-title">${item.title}</h3>
        ${
          item.subtitle
            ? `<p class="result-subtitle">${item.subtitle}</p>`
            : ""
        }
        <p class="result-category">Categoria: ${item.category || "-"}</p>

        <div class="result-prices">
          ${precoPublicHtml}
          ${precoPremiumHtml}
        </div>

        ${
          flags.length
            ? `<div class="result-flags">${flags.join("")}</div>`
            : ""
        }

        ${
          item.tags && item.tags.length
            ? `<div class="result-tags">
                 ${item.tags
                   .map((tag) => `<span class="tag-pill">${tag}</span>`)
                   .join("")}
               </div>`
            : ""
        }

        <!-- Futuro: quando tiver página de produto, é só trocar o # -->
        <a href="#" class="btn-primary btn-sm" onclick="event.preventDefault(); alert('Em breve página de detalhes do produto: ${item.id}');">
          Ver detalhes
        </a>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Faz a chamada na API /api/search
async function carregarResultadosBusca() {
  const params = new URLSearchParams(window.location.search);
  const termo = params.get("q") || "";

  try {
    const resp = await fetch(
      "http://localhost:3000/api/search?q=" + encodeURIComponent(termo)
    );

    const data = await resp.json();

    if (!data.ok) {
      console.error("Erro da API:", data.error);
      const grid = document.getElementById("results-grid");
      if (grid) {
        grid.innerHTML = `<p class="no-results">Erro ao buscar produtos no catálogo Nexus. Tente novamente em alguns instantes.</p>`;
      }
      return;
    }

    renderizarResultados(data);
  } catch (e) {
    console.error("Erro na requisição /api/search:", e);
    const grid = document.getElementById("results-grid");
    if (grid) {
      grid.innerHTML = `<p class="no-results">Não foi possível conectar ao servidor da Nexus. Verifique se o backend está rodando.</p>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", carregarResultadosBusca);
