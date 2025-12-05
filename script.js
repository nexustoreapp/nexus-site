// =============== FUNÇÕES DA HOME ===============

// Preenche a busca rápida da home
function quickPreset(texto) {
  const input = document.getElementById("home-query");
  if (input) {
    input.value = texto;
    input.focus();
  }
}

// Vai para a página buscar.html
function goToPremiumFromHome() {
  const input = document.getElementById("home-query");
  const termo = input ? input.value.trim() : "";

  if (termo) {
    const url = new URL(window.location.origin + "/buscar.html");
    url.searchParams.set("q", termo);
    window.location.href = url.toString();
  } else {
    window.location.href = "buscar.html";
  }
}


// =============== DASHBOARD / PREMIUM (DEMO) ===============

// Quando abre o dashboard, pega o ?q= da URL e joga dentro do input premiumQuery
(function preencherBuscaPremiumComURL() {
  const campo = document.getElementById("premiumQuery");
  if (!campo) return;

  const params = new URLSearchParams(window.location.search);
  const termo = params.get("q");
  if (termo) {
    campo.value = termo;
  }
})();

// Chama o backend do Nexus (rota /api/search/demo)
// e mostra os resultados na tela do Premium (versão antiga, pode ser reaproveitada futuramente)
async function runPremiumSearch() {
  const input = document.getElementById("premium-query");
  const status = document.getElementById("premium-status");
  const resumo = document.getElementById("premium-summary");
  const lista = document.getElementById("premium-results");

  if (!input || !status || !resumo || !lista) return;

  const termo = input.value.trim();

  if (!termo) {
    status.className = "alert error";
    status.textContent = "Digite o nome de um produto para buscar.";
    resumo.textContent = "";
    lista.innerHTML = "";
    return;
  }

  // Mostra mensagem de carregando
  status.className = "alert";
  status.textContent = "Buscando ofertas em modo demonstração...";
  resumo.textContent = "";
  lista.innerHTML = "";

  try {
    // IMPORTANTE: por enquanto chama o backend local
    const resposta = await fetch("http://localhost:3000/api/search/demo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: termo }),
    });

    const data = await resposta.json();

    if (!resposta.ok || !data.ok) {
      status.className = "alert error";
      status.textContent =
        data.error || "Erro ao buscar ofertas. Tente novamente.";
      return;
    }

    // Monta um resumo do que foi buscado
    resumo.textContent =
      'Resultados de demonstração para o termo: "' + data.query + '"';

    // Monta cards com base no que o backend retornou
    if (!Array.isArray(data.results) || data.results.length === 0) {
      lista.innerHTML =
        '<p class="premium-summary">Nenhum resultado retornado pelo backend (modo demo).</p>';
      return;
    }

    const cardsHTML = data.results
      .map(
        (item) => `
        <article class="card-product">
          <h3>${item.title || item.name || "Produto sem nome"}</h3>
          <p class="card-tag">
            Loja: ${item.store || "Loja não informada"} – Dados fictícios (demo)
          </p>
          <p class="card-price">
            ${
              item.price
                ? "R$ " + item.price.toFixed(2).replace(".", ",")
                : "Preço não informado"
            }
          </p>
          <button class="btn-outline">Ver na loja (simulação)</button>
        </article>
      `
      )
      .join("");

    lista.innerHTML = `
      <div class="grid-cards">
        ${cardsHTML}
      </div>
    `;

    status.className = "alert";
    status.textContent =
      "Busca concluída com sucesso (modo demonstração, usando o backend do Nexus).";
  } catch (erro) {
    console.error("Erro na chamada da API:", erro);
    status.className = "alert error";
    status.textContent =
      "Erro de conexão com o servidor do Nexus. Verifique se o backend está rodando.";
  }
}

// =============== ASSINATURA (SIMULAÇÃO) ===============
function simulateCheckout(planId) {
  let planoTexto = "Plano selecionado";

  if (planId === "FREE") planoTexto = "Plano Gratuito";
  if (planId === "PREMIUM_WEEKLY") planoTexto = "Premium Semanal";
  if (planId === "PREMIUM_MONTHLY") planoTexto = "Premium Mensal";
  if (planId === "PREMIUM_YEARLY") planoTexto = "Premium Anual";

  alert(
    planoTexto +
      " selecionado (simulação).\n\n" +
      "Na versão real, aqui vamos abrir o fluxo de pagamento via gateway (ex: Stripe, Mercado Pago...)."
  );
}

// =============== LOGIN (SIMULAÇÃO) ===============
function fakeLogin(event) {
  event.preventDefault();

  const email = document.getElementById("login-email")?.value || "";
  const senha = document.getElementById("login-password")?.value || "";

  if (!email || !senha) {
    alert("Preencha e-mail e senha para continuar (apenas simulação).");
    return false;
  }

  alert(
    "Login de exemplo realizado para: " +
      email +
      ".\n\nNesta versão não há autenticação real, é somente front-end."
  );

  // redireciona agora para a Minha área (dashboard)
  window.location.href = "dashboard.html";
  return false;
}
// ============================
//  BUSCAR.HTML – PÁGINA DE BUSCA REAL
// ============================

// Lê ?q= da URL (se existir)
function getQueryFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("q") || "";
}

// Inicializa a página de busca
function initSearchPage() {
  const input = document.getElementById("search-query");
  const meta = document.getElementById("search-meta-text");

  if (!input) return;

  const termoURL = getQueryFromURL();
  if (termoURL) {
    input.value = termoURL;
    if (meta) {
      meta.textContent = 'Mostrando resultados para: "' + termoURL + '"';
    }
    // Já roda a busca inicial
    runSearchPageSearch();
  }
}

// Função chamada ao clicar no botão "Buscar ofertas"
async function runSearchPageSearch(fromSortChange) {
  const input = document.getElementById("search-query");
  const meta = document.getElementById("search-meta-text");
  const grid = document.getElementById("results-grid");
  const countSpan = document.getElementById("results-count");
  const selectOrdenacao = document.getElementById("sort-select");

  if (!input || !grid) return;

  const termo = input.value.trim();
  if (!termo) {
    if (meta) {
      meta.textContent = "Digite o nome de um produto para buscar.";
    }
    grid.innerHTML = "";
    if (countSpan) countSpan.textContent = "";
    return;
  }

  const sortBy = selectOrdenacao ? selectOrdenacao.value : "relevance";

  // Mensagem de carregando
  if (meta) {
    meta.textContent = "Buscando ofertas em modo demonstração...";
  }
  grid.innerHTML = "";
  if (countSpan) countSpan.textContent = "";

  try {
    // Aqui você pode reaproveitar a mesma rota demo do backend
    const resposta = await fetch("http://localhost:3000/api/search/demo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: termo, sortBy }),
    });

    const data = await resposta.json();

    if (!resposta.ok || !data.ok) {
      if (meta) {
        meta.textContent = data.error || "Erro ao buscar ofertas. Tente novamente.";
      }
      return;
    }

    const resultados = Array.isArray(data.results) ? data.results : [];

    if (meta) {
      meta.textContent = 'Resultados de demonstração para: "' + (data.query || termo) + '"';
    }

    if (countSpan) {
      countSpan.textContent = `Mostrando ${resultados.length} resultado(s).`;
    }

    if (!resultados.length) {
      grid.innerHTML = `
        <p class="premium-summary">
          Nenhuma oferta encontrada no modo demonstração. Tente outro nome de produto.
        </p>
      `;
      return;
    }

    // Montar cards (layout A – estilo lista / comparador)
    const cards = resultados.map((item, index) => {
      const nome = item.title || item.name || "Produto sem nome";
      const loja = item.store || "Loja não informada";
      const preco = typeof item.price === "number" ? item.price : null;
      const precoOriginal = typeof item.originalPrice === "number" ? item.originalPrice : null;
      const imagem = item.image || item.thumbnail || null;
      const freteGratis = item.freeShipping || item.frete_gratis || false;
      const melhorOferta = item.bestOffer || item.melhor_oferta || false;

      const precoFormatado = preco
        ? "R$ " + preco.toFixed(2).replace(".", ",")
        : "Preço não informado";

      const precoOriginalFormatado = precoOriginal
        ? "R$ " + precoOriginal.toFixed(2).replace(".", ",")
        : "";

      // ID para futura página de detalhes
      const produtoId = item.id || index;

      return `
        <article class="result-card">
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
              ${
                melhorOferta
                  ? `<span class="badge badge-best">Melhor oferta</span>`
                  : ""
              }
              ${
                freteGratis
                  ? `<span class="badge badge-frete">Frete grátis</span>`
                  : ""
              }
            </div>

            <div class="result-store">
              ${loja}
            </div>

            <div class="result-prices">
              <span class="price-current">${precoFormatado}</span>
              ${
                precoOriginalFormatado
                  ? `<span class="price-original">${precoOriginalFormatado}</span>`
                  : ""
              }
            </div>

            <div class="result-actions">
              <button class="btn-outline" onclick="verDetalhesProduto('${produtoId}')">
                Ver detalhes
              </button>
            </div>
          </div>
        </article>
      `;
    });

    grid.innerHTML = cards.join("");
  } catch (erro) {
    console.error("Erro na busca da página de resultados:", erro);
    if (meta) {
      meta.textContent =
        "Erro de conexão com o servidor do Nexus. Verifique se o backend está rodando.";
    }
  }
}

// Placeholder para futura página de detalhes
function verDetalhesProduto(produtoId) {
  // No futuro: redirecionar para uma página de detalhes (produto.html)
  // passando o ID, ex:
  // window.location.href = "produto.html?id=" + encodeURIComponent(produtoId);

  alert(
    "Detalhes do produto (demo).\n\n" +
      "No projeto real, isso vai abrir uma página com TODAS as especificações, reviews, frete, etc.\n\n" +
      "ID do produto: " + produtoId
  );
}
