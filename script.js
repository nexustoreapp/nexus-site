// =============== FUNÇÕES DA HOME ===============

// Preenche a busca rápida da home
function quickPreset(texto) {
  const input = document.getElementById("home-query");
  if (input) {
    input.value = texto;
    input.focus();
  }
}

// Vai para a página Premium levando o texto da busca (via query string simples)
function goToPremiumFromHome() {
  const input = document.getElementById("home-query");
  const termo = input ? input.value.trim() : "";

  // guarda o termo na URL para a página premium ler depois
  if (termo) {
    const url = new URL(window.location.origin + "/premium.html");
    url.searchParams.set("q", termo);
    window.location.href = url.toString();
  } else {
    window.location.href = "premium.html";
  }
}

// =============== PREMIUM ===============

// Lê o parâmetro q= da URL (se existir) e joga no input da premium
(function preencherBuscaPremiumComURL() {
  const campo = document.getElementById("premium-query");
  if (!campo) return;

  const params = new URLSearchParams(window.location.search);
  const termo = params.get("q");
  if (termo) {
    campo.value = termo;
  }
})();

// Simulação de busca – NÃO é API real
function runPremiumSearch() {
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

  // Aviso de que é só visual
  status.className = "alert";
  status.textContent =
    "Simulação visual: nesta versão não há conexão real com Shopee, Amazon, AliExpress etc.";

  resumo.textContent =
    "Exemplo fictício de comparação para o termo: \"" + termo + "\".";

  // Geração de cards fake só para mostrar o layout
  lista.innerHTML = `
    <div class="grid-cards">
      <article class="card-product">
        <div class="card-glow"></div>
        <h3>${termo} - Loja A</h3>
        <p class="card-tag">Exemplo de loja (dados fictícios)</p>
        <p class="card-price">R$ 199,90</p>
        <button class="btn-outline">Ir para a loja (simulação)</button>
      </article>

      <article class="card-product">
        <div class="card-glow"></div>
        <h3>${termo} - Loja B</h3>
        <p class="card-tag">Exemplo de loja (dados fictícios)</p>
        <p class="card-price">R$ 209,90</p>
        <button class="btn-outline">Ir para a loja (simulação)</button>
      </article>

      <article class="card-product">
        <div class="card-glow"></div>
        <h3>${termo} - Loja C</h3>
        <p class="card-tag">Exemplo de loja (dados fictícios)</p>
        <p class="card-price">R$ 215,50</p>
        <button class="btn-outline">Ir para a loja (simulação)</button>
      </article>
    </div>
  `;
}

// =============== ASSINATURA (SIMULAÇÃO) ===============
function simulateCheckout() {
  alert(
    "Fluxo de pagamento ainda é só visual.\n\n" +
      "Para cobrar de verdade no futuro, você pode integrar um gateway como Stripe, Mercado Pago etc."
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

  // redireciona só para mostrar fluxo
  window.location.href = "premium.html";
  return false;
}
