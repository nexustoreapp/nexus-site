// 1 — Lê o termo da URL (?q=...)
const params = new URLSearchParams(window.location.search);
const termo = params.get("q") || "";

// Elementos da página
const metaEl = document.getElementById("search-meta");
const grid = document.getElementById("results-grid");

if (metaEl) {
  metaEl.textContent = termo
    ? `Mostrando resultados para: "${termo}"`
    : "Nenhum termo informado. Volte à página inicial e faça uma nova busca.";
}

// 2 — Função principal: chama a API do backend (demo)
async function buscarProdutos() {
  if (!termo) {
    grid.innerHTML = `
      <p class="premium-summary">
        Nenhum termo de busca foi informado. Volte para a página inicial e digite o nome de um produto.
      </p>
    `;
    return;
  }

  // Mensagem inicial
  grid.innerHTML = `
    <p class="premium-summary">
      Buscando ofertas em modo demonstração...
    </p>
  `;

  try {
    const resposta = await fetch("http://localhost:3000/api/search/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: termo }),
    });

    const data = await resposta.json();

    if (!resposta.ok || !data.ok) {
      grid.innerHTML = `
        <p class="premium-summary">
          Erro ao buscar ofertas. ${
            data.error ? "Detalhe: " + data.error : "Tente novamente mais tarde."
          }
        </p>
      `;
      return;
    }

    const resultados = Array.isArray(data.results) ? data.results : [];

    if (!resultados.length) {
      grid.innerHTML = `
        <p class="premium-summary">
          Nenhuma oferta encontrada no modo demonstração. Tente outro nome de produto.
        </p>
      `;
      return;
    }

    // 3 — Renderiza os cards de resultado
    grid.innerHTML = ""; // limpa

    resultados.forEach((produto, index) => {
      const card = document.createElement("article");
      card.className = "result-card";

      const nome = produto.title || "Produto sem nome";
const loja = produto.store || "Loja não informada";
const preco =
  typeof produto.price === "number"
    ? "R$ " + produto.price.toFixed(2).replace(".", ",")
    : "Preço não informado";
const imagem = produto.image || null;
const link = produto.permalink || "#";
const freteGratis = produto.freeShipping;

      card.innerHTML = `
  <div class="result-thumb">
    ${
      imagem
        ? `<img src="${imagem}" alt="${nome}" />`
        : `<div class="thumb-placeholder">Sem imagem</div>`
    }
  </div>

  <div class="result-body">
    <div class="result-header">
      <h2>${nome}</h2>
    </div>

    <p class="result-store">
      ${loja}
      ${
        freteGratis
          ? `<span class="badge badge-best">Frete grátis</span>`
          : ""
      }
    </p>

    <div class="result-prices">
      <span class="price-current">${preco}</span>
    </div>

    <div class="result-actions">
      <a href="${link}" target="_blank" class="btn-outline">
        Ver na loja
      </a>
    </div>
  </div>
`;

      // Clique do card → leva para produto.html com índice (ainda demo)
      card.addEventListener("click", () => {
        window.location.href = `produto.html?idx=${index}`;
      });

      grid.appendChild(card);
    });
  } catch (erro) {
    console.error("Erro na chamada da API de busca:", erro);
    grid.innerHTML = `
      <p class="premium-summary">
        Erro de conexão com o servidor do Nexus. Verifique se o backend está rodando em
        <code>http://localhost:3000</code>.
      </p>
    `;
  }
}

// 4 — Roda automaticamente ao carregar a página
document.addEventListener("DOMContentLoaded", buscarProdutos);
