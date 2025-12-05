// 1 — Lê o termo da URL
const params = new URLSearchParams(window.location.search);
const termo = params.get("q") || "";
document.getElementById("search-meta").textContent =
  `Mostrando resultados para: "${termo}"`;

// 2 — Grid onde os produtos entrarão
const grid = document.getElementById("results-grid");

// 3 — Chama sua API real (ou demo)
async function buscarProdutos() {
  try {
    const resposta = await fetch("http://localhost:3000/api/search/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: termo })
    });

    const data = await resposta.json();

    if (!data || !data.results) {
      grid.innerHTML = "<p>Sem resultados.</p>";
      return;
    }

    // salva no localStorage para a página produto.html
    localStorage.setItem("nexus:lastSearchResults", JSON.stringify(data));

    // monta os cards
    montarCards(data.results);

  } catch (e) {
    console.error("Erro:", e);
    grid.innerHTML = "<p>Erro na busca.</p>";
  }
}

buscarProdutos();


// 4 — Função que monta os cards
function montarCards(lista) {
  grid.innerHTML = "";

  lista.forEach((produto, index) => {
    const card = document.createElement("div");
    card.className = "result-card";

    card.innerHTML = `
      <div class="result-thumb">
        ${produto.image_url ?
           `<img src="${produto.image_url}">` :
           `<div class="thumb-placeholder">Sem imagem</div>`}
      </div>

      <div class="result-body">
        <div class="result-header">
          <h2>${produto.title || "Sem nome"}</h2>
        </div>

        <p class="result-store">${produto.store || "Loja desconhecida"}</p>

        <div class="result-prices">
          <span class="price-current">R$ ${produto.price?.toFixed(2)}</span>
        </div>
      </div>
    `;

    // AQUI ESTÁ O CLICK DO PRODUTO ✔️
    card.addEventListener("click", () => {
      window.location.href = `produto.html?idx=${index}`;
    });

    grid.appendChild(card);
  });
}
