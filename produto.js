// produto.js
// Pega o ID do produto da URL: produto.html?id=123
function getProductIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// Formata preço: 199.9 -> "R$ 199,90"
function formatarPreco(preco) {
  if (typeof preco !== "number") return "R$ 0,00";
  return preco.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Carrega o produto da API demo
async function carregarProduto() {
  const produtoId = getProductIdFromURL();

  // Se não tiver ID na URL, mostra erro simples
  if (!produtoId) {
    document.getElementById("product-title").textContent =
      "Produto não encontrado (sem ID na URL)";
    return;
  }

  try {
    // CHAMANDO O BACKEND DEMO DO NEXUS
    const resposta = await fetch("http://localhost:3000/api/product/demo?id=" + encodeURIComponent(produtoId));

    const data = await resposta.json();

    // Se deu erro na API
    if (!resposta.ok || data.error) {
      document.getElementById("product-title").textContent =
        data.error || "Erro ao carregar produto (demo).";
      return;
    }

    // ========= MAPEAMENTO DOS CAMPOS DA API =========
    // Sua API manda: title, store, price
    const titulo = data.title || "Produto sem nome";
    const loja = data.store || "Loja não informada";
    const preco = typeof data.price === "number" ? data.price : 0;

    // ========= PREENCHE A TELA =========

    // Títulos
    const tituloPrincipal = document.getElementById("product-title");
    const tituloMenor = document.getElementById("product-title-small");
    const lojaTopo = document.getElementById("product-store");
    const lojaInline = document.getElementById("product-store-inline");
    const precoEl = document.getElementById("product-price");
    const rawEl = document.getElementById("product-raw");

    if (tituloPrincipal) tituloPrincipal.textContent = titulo;
    if (tituloMenor) tituloMenor.textContent = titulo;

    if (lojaTopo) lojaTopo.textContent = "Vendido por: " + loja;
    if (lojaInline) lojaInline.textContent = "Loja: " + loja;

    if (precoEl) precoEl.textContent = formatarPreco(preco);

    // Especificações – por enquanto simples
    const specsEl = document.getElementById("product-specs");
    if (specsEl) {
      specsEl.textContent =
        "Produto listado como \"" +
        titulo +
        "\" na loja " +
        loja +
        " com preço de " +
        formatarPreco(preco) +
        ". Em breve aqui entram especificações técnicas reais vindas da API (marca, modelo, memória, etc.).";
    }

    // Debug: mostra JSON cru
    if (rawEl) {
      rawEl.textContent = JSON.stringify(data, null, 2);
    }

  } catch (erro) {
    console.error("Erro ao buscar produto:", erro);
    const tituloPrincipal = document.getElementById("product-title");
    if (tituloPrincipal) {
      tituloPrincipal.textContent =
        "Erro de conexão com o servidor do Nexus (produto demo).";
    }
  }
}

// roda quando a página abre
carregarProduto();
