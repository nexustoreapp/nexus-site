// produto.js

// 1) Pegar o ID do produto que veio na URL: produto.html?id=123
function getProductIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// 2) Formatador de preço: 199.9 -> "R$ 199,90"
function formatarPreco(preco) {
  if (typeof preco !== "number") return "R$ 0,00";
  return preco.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// 3) SIMULAÇÃO DE FRETE (sem API real ainda)
function simularFrete(cep, precoProduto) {
  // limpando tudo que não for número
  const cepLimpo = (cep || "").replace(/\D/g, "");

  // regras bem simples só pra demo
  let base = 29.9;
  let prazo = "7 a 12 dias úteis";
  let tipo = "Transportadora padrão";

  if (cepLimpo.startsWith("0") || cepLimpo.startsWith("1")) {
    base = 19.9;
    prazo = "4 a 7 dias úteis";
    tipo = "Expresso Sudeste (demo)";
  } else if (cepLimpo.startsWith("7") || cepLimpo.startsWith("8") || cepLimpo.startsWith("9")) {
    base = 34.9;
    prazo = "8 a 15 dias úteis";
    tipo = "Entrega região Centro-Oeste / Norte / Nordeste (demo)";
  }

  // se o produto for mais caro, dá um "desconto" no frete só pra deixar legal
  if (precoProduto > 200) {
    base = base - 5;
  }
  if (precoProduto > 500) {
    base = 0; // frete grátis demo
    tipo = tipo + " — Frete grátis (demo)";
  }

  return {
    valor: base < 0 ? 0 : base,
    prazo,
    tipo,
  };
}

// 4) Preencher as especificações técnicas (demo)
function preencherEspecificacoes(data) {
  const lista = document.getElementById("specs-list");
  if (!lista) return;

  lista.innerHTML = "";

  // Se o backend, no futuro, mandar algo tipo: { specs: { marca: "...", modelo: "..." } }
  if (data.specs && typeof data.specs === "object") {
    const entries = Object.entries(data.specs);
    if (entries.length > 0) {
      for (const [chave, valor] of entries) {
        const li = document.createElement("li");
        li.style.padding = "4px 0";
        li.innerHTML = `<strong>${chave}:</strong> ${valor}`;
        lista.appendChild(li);
      }
      return;
    }
  }

  // Enquanto não tem specs reais na API, colocamos alguns exemplos baseados nos dados que já temos
  const titulo = data.title || "Produto eletrônico (demo)";
  const loja = data.store || "Loja não informada";

  const specsDemo = [
    { label: "Nome listado", value: titulo },
    { label: "Loja", value: loja },
    { label: "Categoria (demo)", value: "Eletrônicos / Gamer" },
    { label: "Garantia (demo)", value: "12 meses com a loja / fabricante" },
    { label: "Origem do dado", value: "API demo Nexus" },
  ];

  specsDemo.forEach((spec) => {
    const li = document.createElement("li");
    li.style.padding = "4px 0";
    li.innerHTML = `<strong>${spec.label}:</strong> ${spec.value}`;
    lista.appendChild(li);
  });
}

// 5) Carregar o produto da API demo
async function carregarProduto() {
  const produtoId = getProductIdFromURL();

  if (!produtoId) {
    document.getElementById("product-title").textContent =
      "Produto não encontrado (sem ID na URL)";
    return;
  }

  try {
    const resposta = await fetch(
      "http://localhost:3000/api/product/demo?id=" + encodeURIComponent(produtoId)
    );

    const data = await resposta.json();

    if (!resposta.ok || data.error) {
      document.getElementById("product-title").textContent =
        data.error || "Erro ao carregar produto (demo).";
      return;
    }

    // === Campos que a API já manda ===
    const titulo = data.title || "Produto sem nome";
    const loja = data.store || "Loja não informada";
    const preco = typeof data.price === "number" ? data.price : 0;

    // === Preenche título, loja, preço ===
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

    // === Especificações técnicas (demo, com estrutura pra API real) ===
    preencherEspecificacoes(data);

    // === Debug JSON cru ===
    if (rawEl) {
      rawEl.textContent = JSON.stringify(data, null, 2);
    }

    // === Configura o formulário de frete para usar o preço correto ===
    configurarFrete(preco);

  } catch (erro) {
    console.error("Erro ao buscar produto:", erro);
    const tituloPrincipal = document.getElementById("product-title");
    if (tituloPrincipal) {
      tituloPrincipal.textContent =
        "Erro de conexão com o servidor do Nexus (produto demo).";
    }
  }
}

// 6) Conecta o formulário de frete com a simulação
function configurarFrete(precoProduto) {
  const form = document.getElementById("frete-form");
  const inputCep = document.getElementById("frete-cep");
  const resultado = document.getElementById("frete-resultado");

  if (!form || !inputCep || !resultado) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const cep = inputCep.value.trim();
    const cepNumeros = cep.replace(/\D/g, "");

    if (cepNumeros.length < 5) {
      resultado.style.display = "block";
      resultado.style.color = "#fecaca"; // vermelho clarinho
      resultado.textContent = "Digite um CEP válido (pelo menos 5 números) para simular o frete.";
      return;
    }

    const frete = simularFrete(cep, precoProduto);

    resultado.style.display = "block";
    resultado.style.color = "#e5e7eb";
    resultado.innerHTML =
      `<strong>Frete simulado:</strong> ${formatarPreco(frete.valor)}<br>` +
      `<strong>Prazo estimado:</strong> ${frete.prazo}<br>` +
      `<strong>Tipo de entrega:</strong> ${frete.tipo}<br>` +
      `<span style="font-size: 0.78rem; color: #9ca3af;">Simulação apenas para demonstração. No projeto real, isso virá da API de frete.</span>`;
  });
}

// 7) Roda assim que a página de produto carregar
carregarProduto();
