// ===== 1. Descobre qual produto foi clicado (idx da URL) =====
const params = new URLSearchParams(window.location.search);
const idx = parseInt(params.get("idx"), 10);

// Pega o JSON salvo na busca
const raw = localStorage.getItem("nexus:lastSearchResults");

if (!raw || Number.isNaN(idx)) {
  document.getElementById("product-title").textContent =
    "Produto não encontrado (dados ausentes).";
} else {
  try {
    const data = JSON.parse(raw);
    const lista = data.results || [];
    const produto = lista[idx];

    if (!produto) {
      document.getElementById("product-title").textContent =
        "Produto não encontrado (índice inválido).";
    } else {
      preencherPagina(produto, idx);
    }
  } catch (e) {
    console.error("Erro ao ler localStorage:", e);
    document.getElementById("product-title").textContent =
      "Erro ao carregar dados do produto.";
  }
}

// ===== 2. Função que preenche a tela =====
function preencherPagina(produto, index) {
  // Título
  const titulo = produto.title || produto.name || "Produto sem nome";
  document.getElementById("product-title").textContent = titulo;

  // Loja
  const loja = produto.store || "Loja desconhecida";
  document.getElementById("product-store").textContent = `Vendido por: ${loja}`;

  // ID (só pra debug/identificação)
  const idTexto = produto.id || produto.sku || `ID interno #${index}`;
  document.getElementById("product-id").textContent = `ID: ${idTexto}`;

  // Imagem
  const wrapper = document.getElementById("product-image-wrapper");
  wrapper.innerHTML = "";
  if (produto.image_url) {
    const img = document.createElement("img");
    img.src = produto.image_url;
    img.alt = titulo;
    wrapper.appendChild(img);
  } else {
    wrapper.innerHTML = `<div class="thumb-placeholder">Sem imagem</div>`;
  }

  // Preço
  const priceEl = document.getElementById("product-price");
  const oldPriceEl = document.getElementById("product-old-price");
  const extraEl = document.getElementById("product-extra");

  if (produto.price) {
    priceEl.textContent = "R$ " + produto.price.toFixed(2).replace(".", ",");
  } else {
    priceEl.textContent = "Preço não informado";
  }

  if (produto.old_price && produto.old_price > produto.price) {
    oldPriceEl.textContent =
      "De R$ " + produto.old_price.toFixed(2).replace(".", ",");
  } else {
    oldPriceEl.textContent = "";
  }

  if (produto.installments) {
    extraEl.textContent = produto.installments;
  } else if (produto.shipping) {
    extraEl.textContent = produto.shipping;
  } else {
    extraEl.textContent = "";
  }

  // Especificações (tentamos montar algo bonitinho se tiver campos)
  const specsContainer = document.getElementById("product-specs");
  specsContainer.innerHTML = "";

  const specsList = document.createElement("ul");
  specsList.className = "product-specs-list";

  // Exemplos de campos que podemos puxar (dependendo da sua API real)
  adicionarSpec(specsList, "Marca", produto.brand);
  adicionarSpec(specsList, "Modelo", produto.model);
  adicionarSpec(specsList, "Categoria", produto.category);
  adicionarSpec(specsList, "Loja", loja);

  if (produto.rating) {
    adicionarSpec(specsList, "Avaliação média", produto.rating + " ⭐");
  }
  if (produto.review_count) {
    adicionarSpec(specsList, "Nº de avaliações", produto.review_count);
  }

  if (specsList.children.length === 0) {
    specsContainer.innerHTML =
      "<p>Especificações detalhadas ainda não disponíveis para este produto (modo demo).</p>";
  } else {
    specsContainer.appendChild(specsList);
  }

  // Dados brutos da API (debug)
  const rawPre = document.getElementById("product-raw");
  rawPre.textContent = JSON.stringify(produto, null, 2);

  // Botão "ver na loja" (por enquanto só alerta)
  const btnLoja = document.getElementById("btn-ver-na-loja");
  btnLoja.addEventListener("click", () => {
    if (produto.url) {
      window.open(produto.url, "_blank");
    } else {
      alert(
        "Esta é apenas uma simulação.\n\nNa versão real, aqui abriríamos o link da loja oficial."
      );
    }
  });

  // Botão "adicionar ao carrinho" (demo)
  const btnCarrinho = document.getElementById("btn-add-carrinho");
  btnCarrinho.addEventListener("click", () => {
    alert(
      "Carrinho ainda em modo demo.\n\nNo futuro, este produto será salvo no seu carrinho Nexus."
    );
  });

  // Botão "calcular frete" (demo)
  const btnFrete = document.getElementById("btn-frete");
  const inputCep = document.getElementById("frete-cep");
  const freteResult = document.getElementById("frete-result");

  btnFrete.addEventListener("click", () => {
    const cep = (inputCep.value || "").trim();
    if (!cep) {
      freteResult.textContent = "Digite um CEP válido para simular o frete.";
      return;
    }

    // Simulação de frete: só texto mesmo por enquanto
    freteResult.textContent =
      "Frete estimado para " +
      cep +
      ": R$ 29,90 (prazo médio 5 a 9 dias úteis). (Simulação)";
  });
}

// Função helper pra specs
function adicionarSpec(list, label, value) {
  if (!value) return;
  const li = document.createElement("li");
  li.innerHTML = `<strong>${label}:</strong> <span>${value}</span>`;
  list.appendChild(li);
}
