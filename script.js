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

    // salva os últimos resultados para a página de produto
    try {
      localStorage.setItem("nexusLastResults", JSON.stringify(resultados));
    } catch (e) {
      console.warn("Não foi possível salvar resultados no localStorage:", e);
    }

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

    // Montar cards (layout lista, estilo comparador)
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

      const produtoIndex = index; // usamos o índice como ID na página de produto

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
              <button class="btn-outline" onclick="verDetalhesProduto(${produtoIndex})">
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

// Abre a página de detalhes de produto, usando o índice salvo
function verDetalhesProduto(produtoIndex) {
  const url = new URL(window.location.origin + "/produto.html");
  url.searchParams.set("idx", String(produtoIndex));
  window.location.href = url.toString();
}
// ============================
//  PRODUTO.HTML – DETALHES DO PRODUTO (DEMO)
// ============================

function getProductIndexFromURL() {
  const params = new URLSearchParams(window.location.search);
  const idx = parseInt(params.get("idx"), 10);
  return Number.isNaN(idx) ? null : idx;
}

function getLastResultsFromStorage() {
  try {
    const raw = localStorage.getItem("nexusLastResults");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.warn("Erro ao ler nexusLastResults do localStorage:", e);
    return [];
  }
}

function initProductPage() {
  const idx = getProductIndexFromURL();
  const results = getLastResultsFromStorage();

  const titleEl = document.getElementById("product-title");
  const subtitleEl = document.getElementById("product-subtitle");
  const storeEl = document.getElementById("product-store");
  const storeSmallEl = document.getElementById("product-store-small");
  const priceEl = document.getElementById("product-price");
  const priceNoteEl = document.getElementById("product-price-note");
  const imageWrapper = document.getElementById("product-image-wrapper");
  const specsContainer = document.getElementById("product-specs");
  const descEl = document.getElementById("product-description");
  const offersEl = document.getElementById("product-offers");

  if (idx === null || !results.length || !results[idx]) {
    if (titleEl) titleEl.textContent = "Produto não encontrado (demo)";
    if (subtitleEl) {
      subtitleEl.textContent =
        "Volte para a página de busca e selecione um produto novamente.";
    }
    if (specsContainer) {
      specsContainer.innerHTML =
        "<p class='product-section-note'>Não foi possível carregar os dados deste produto.</p>";
    }
    return;
  }

  const item = results[idx];

  const nome = item.title || item.name || "Produto sem nome (demo)";
  const loja = item.store || "Loja não informada";
  const preco = typeof item.price === "number" ? item.price : null;
  const precoOriginal = typeof item.originalPrice === "number" ? item.originalPrice : null;
  const imagem = item.image || item.thumbnail || null;

  if (titleEl) titleEl.textContent = nome;
  if (subtitleEl) {
    subtitleEl.textContent =
      item.subtitle ||
      item.subtitleText ||
      "Informações completas serão carregadas das APIs das lojas na versão final.";
  }

  if (storeEl) storeEl.textContent = loja;
  if (storeSmallEl) storeSmallEl.textContent = loja;

  if (priceEl) {
    if (preco) {
      priceEl.textContent = "R$ " + preco.toFixed(2).replace(".", ",");
    } else {
      priceEl.textContent = "Preço não informado (demo)";
    }
  }

  if (priceNoteEl && precoOriginal) {
    priceNoteEl.textContent =
      "Preço atual comparado ao valor cheio de R$ " +
      precoOriginal.toFixed(2).replace(".", ",") +
      " (dados de demonstração).";
  }

  if (imageWrapper) {
    if (imagem) {
      imageWrapper.innerHTML = `<img src="${imagem}" alt="${nome}" />`;
    } else {
      imageWrapper.innerHTML =
        `<div class="thumb-placeholder product-thumb-placeholder">Sem imagem disponível</div>`;
    }
  }

  // ESPECIFICAÇÕES (demo): tenta ler item.specs, se não tiver, monta um básico
  if (specsContainer) {
    let specsHTML = "";

    if (Array.isArray(item.specs)) {
      specsHTML += `<dl class="product-specs-table">`;
      item.specs.forEach((spec) => {
        if (!spec || !spec.label) return;
        specsHTML += `
          <div class="product-spec-row">
            <dt>${spec.label}</dt>
            <dd>${spec.value || "-"}</dd>
          </div>
        `;
      });
      specsHTML += `</dl>`;
    } else if (item.specs && typeof item.specs === "object") {
      specsHTML += `<dl class="product-specs-table">`;
      Object.keys(item.specs).forEach((key) => {
        specsHTML += `
          <div class="product-spec-row">
            <dt>${key}</dt>
            <dd>${item.specs[key]}</dd>
          </div>
        `;
      });
      specsHTML += `</dl>`;
    } else {
      specsHTML = `
        <dl class="product-specs-table">
          <div class="product-spec-row">
            <dt>Loja</dt>
            <dd>${loja}</dd>
          </div>
          <div class="product-spec-row">
            <dt>Preço exibido</dt>
            <dd>${preco ? "R$ " + preco.toFixed(2).replace(".", ",") : "Não informado"}</dd>
          </div>
          <div class="product-spec-row">
            <dt>Modo</dt>
            <dd>Demonstração (dados fictícios). Na versão final, vem da API.</dd>
          </div>
        </dl>
      `;
    }

    specsContainer.innerHTML = specsHTML;
  }

  // Descrição (demo)
  if (descEl) {
    descEl.textContent =
      item.description ||
      "Na versão completa, aqui entra a descrição consolidada das lojas com curadoria por IA, destacando os pontos fortes, limitações e o que prestar atenção antes de comprar.";
  }

  // Ofertas por loja (demo)
  if (offersEl) {
    const offers = Array.isArray(item.offers) ? item.offers : [];

    if (!offers.length) {
      offersEl.innerHTML = `
        <div class="product-offer-card">
          <p class="product-offer-store">${loja}</p>
          <p class="product-offer-price">
            ${preco ? "R$ " + preco.toFixed(2).replace(".", ",") : "Preço não informado"}
          </p>
          <p class="product-offer-note">
            Exemplo de oferta única em modo demo. No futuro, vamos listar várias lojas aqui.
          </p>
        </div>
      `;
    } else {
      offersEl.innerHTML = offers
        .map((of) => {
          const lojaOf = of.store || of.loja || "Loja não informada";
          const precoOf =
            typeof of.price === "number"
              ? "R$ " + of.price.toFixed(2).replace(".", ",")
              : "Preço não informado";
          const freteOf =
            of.shipping ||
            of.frete ||
            "Frete a calcular (integração futura com correios/transportadoras).";
          return `
            <div class="product-offer-card">
              <p class="product-offer-store">${lojaOf}</p>
              <p class="product-offer-price">${precoOf}</p>
              <p class="product-offer-shipping">${freteOf}</p>
            </div>
          `;
        })
        .join("");
    }
  }
}

// Simulação básica de frete (demo)
function calcularFreteDemo() {
  const cepInput = document.getElementById("cep-input");
  const freteResultado = document.getElementById("frete-resultado");
  if (!cepInput || !freteResultado) return;

  const cep = cepInput.value.replace(/\D/g, "");
  if (cep.length < 8) {
    freteResultado.textContent = "Digite um CEP válido com 8 dígitos.";
    return;
  }

  // Só pra demo: valor aleatório
  const base = 19.9;
  const variacao = (parseInt(cep.slice(-2), 10) % 10) * 1.2;
  const valor = base + variacao;

  freteResultado.textContent =
    "Frete estimado (demo): R$ " + valor.toFixed(2).replace(".", ",") + " · Entrega em 5 a 9 dias úteis.";
}
