// =============== FUNÇÕES DA HOME ===============

// Preenche a busca rápida da home
function quickPreset(texto) {
  const input = document.getElementById("home-query");
  if (input) {
    input.value = texto;
    input.focus();
  }
}

// Vai para a página Minha área (dashboard) levando o texto da busca (via query string simples)
function goToPremiumFromHome() {
  const input = document.getElementById("home-query");
  const termo = input ? input.value.trim() : "";

  if (termo) {
    const url = new URL(window.location.origin + "/dashboard.html");
    url.searchParams.set("q", termo);
    window.location.href = url.toString();
  } else {
    window.location.href = "dashboard.html";
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
