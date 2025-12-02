// =====================================================
// CONFIGURAÇÃO BÁSICA DE PLANOS (FRONT-END SIMULADO)
// =====================================================

const NEXUS_PLANS = {
  FREE: {
    code: "FREE",
    label: "Gratuito",
    priceLabel: "R$ 0,00 / semana",
    description:
      "Acesso a 5–10 lojas menores, apenas produtos com desconto, comissão Nexus maior.",
    storesInfo: "Consultando apenas lojas menores (exemplo).",
    commissionInfo: "Comissão maior aplicada sobre o preço base."
  },
  PREMIUM_WEEKLY: {
    code: "PREMIUM_WEEKLY",
    label: "Premium Semanal",
    priceLabel: "R$ 8,99 / semana",
    description:
      "Acesso a grandes marketplaces e lojas menores, IA mais precisa, comissão Nexus menor.",
    storesInfo: "Consultando grandes lojas + lojas menores (exemplo).",
    commissionInfo: "Comissão reduzida aplicada sobre o preço base."
  },
  PREMIUM_MONTHLY: {
    code: "PREMIUM_MONTHLY",
    label: "Premium Mensal",
    priceLabel: "R$ 16,99 / mês",
    description:
      "Todos os recursos do Premium com melhor custo-benefício mensal.",
    storesInfo: "Consultando grandes lojas + lojas menores (exemplo).",
    commissionInfo: "Comissão reduzida aplicada sobre o preço base."
  },
  PREMIUM_YEARLY: {
    code: "PREMIUM_YEARLY",
    label: "Premium Anual",
    priceLabel: "R$ 210,99 / ano",
    description:
      "Acesso total ao Nexus durante o ano inteiro, plano mais econômico a longo prazo.",
    storesInfo: "Consultando grandes lojas + lojas menores (exemplo).",
    commissionInfo: "Comissão reduzida aplicada sobre o preço base."
  }
};

const NEXUS_PLAN_STORAGE_KEY = "nexus_active_plan";

// Retorna o plano salvo no navegador (ou FREE se não tiver nada)
function getCurrentPlan() {
  const stored = localStorage.getItem(NEXUS_PLAN_STORAGE_KEY);
  if (stored && NEXUS_PLANS[stored]) {
    return NEXUS_PLANS[stored];
  }
  return NEXUS_PLANS.FREE;
}

// Salva plano escolhido (simulação de assinatura)
function setCurrentPlan(planCode) {
  if (!NEXUS_PLANS[planCode]) {
    localStorage.setItem(NEXUS_PLAN_STORAGE_KEY, NEXUS_PLANS.FREE.code);
    return NEXUS_PLANS.FREE;
  }
  localStorage.setItem(NEXUS_PLAN_STORAGE_KEY, planCode);
  return NEXUS_PLANS[planCode];
}

// =====================================================
// FUNÇÕES DA HOME
// =====================================================

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

  // usa caminho relativo para funcionar bem em GitHub Pages / domínio customizado
  if (termo) {
    const url = new URL("premium.html", window.location.href);
    url.searchParams.set("q", termo);
    window.location.href = url.toString();
  } else {
    window.location.href = "premium.html";
  }
}

// =====================================================
// PREMIUM
// =====================================================

// Ao carregar a página Premium, preenche o campo com ?q= da URL
(function preencherBuscaPremiumComURL() {
  const campo = document.getElementById("premium-query");
  if (!campo) return;

  const params = new URLSearchParams(window.location.search);
  const termo = params.get("q");
  if (termo) {
    campo.value = termo;
  }
})();

// Atualiza o texto de status do Premium com base no plano salvo
(function atualizarStatusPremiumPorPlano() {
  const status = document.getElementById("premium-status");
  if (!status) return;

  const plano = getCurrentPlan();

  status.className = "alert";
  status.innerHTML =
    `<strong>Plano atual (simulado): ${plano.label}</strong><br>` +
    `${plano.description}<br>` +
    `<span class="small-text">${plano.storesInfo} ${plano.commissionInfo}</span>`;
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

  const plano = getCurrentPlan();

  // Aviso de que é só visual + info do plano
  status.className = "alert";
  status.innerHTML =
    `Buscando (simulação) para o termo <strong>"${termo}"</strong> no plano <strong>${plano.label}</strong>.<br>` +
    `<span class="small-text">${plano.storesInfo} ${plano.commissionInfo}</span>`;

  resumo.innerHTML =
    `Exemplo fictício de comparação para o termo <strong>"${termo}"</strong>.<br>` +
    `<span class="small-text">Em produção, aqui o front chamaria a API do back-end Nexus.</span>`;

  // Simula diferença de preços (melhores preços no Premium, por exemplo)
  const basePrice = plano.code === "FREE" ? 220 : 200;
  const priceA = basePrice;
  const priceB = basePrice + 10;
  const priceC = basePrice + 20;

  lista.innerHTML = `
    <div class="grid-cards">
      <article class="card-product">
        <div class="card-glow"></div>
        <h3>${termo} - Loja A</h3>
        <p class="card-tag">Exemplo de loja (dados fictícios)</p>
        <p class="card-price">R$ ${priceA.toFixed(2).replace('.', ',')}</p>
        <button class="btn-outline">Ir para a loja (simulação)</button>
      </article>

      <article class="card-product">
        <div class="card-glow"></div>
        <h3>${termo} - Loja B</h3>
        <p class="card-tag">Exemplo de loja (dados fictícios)</p>
        <p class="card-price">R$ ${priceB.toFixed(2).replace('.', ',')}</p>
        <button class="btn-outline">Ir para a loja (simulação)</button>
      </article>

      <article class="card-product">
        <div class="card-glow"></div>
        <h3>${termo} - Loja C</h3>
        <p class="card-tag">Exemplo de loja (dados fictícios)</p>
        <p class="card-price">R$ ${priceC.toFixed(2).replace('.', ',')}</p>
        <button class="btn-outline">Ir para a loja (simulação)</button>
      </article>
    </div>
  `;
}

// =====================================================
// ASSINATURA (SIMULAÇÃO DE ESCOLHA DE PLANO)
// =====================================================

// Recebe um código de plano, salva no localStorage e mostra alerta
function simulateCheckout(planCode) {
  const plano = setCurrentPlan(planCode || "FREE");

  alert(
    "Plano selecionado (simulação): " +
      plano.label +
      "\n\n" +
      "Valor: " +
      plano.priceLabel +
      "\n" +
      "Descrição: " +
      plano.description +
      "\n\n" +
      "Nesta versão ainda não há cobrança real. " +
      "No futuro, aqui será integrada uma API de pagamentos (ex: Stripe, Mercado Pago, etc.)."
  );

  // Depois de escolher plano, faz sentido levar o usuário para a página Premium
  window.location.href = "premium.html";
}

// =====================================================
// LOGIN (SIMULAÇÃO)
// =====================================================

function fakeLogin(event) {
  event.preventDefault();

  const email = document.getElementById("login-email")?.value || "";
  const senha = document.getElementById("login-password")?.value || "";

  if (!email || !senha) {
    alert("Preencha e-mail e senha para continuar (apenas simulação).");
    return false;
  }

  // Aqui no futuro você chamaria o back-end (/auth/login) e faria o fluxo 2FA
  alert(
    "Login de exemplo realizado para: " +
      email +
      ".\n\nNesta versão não há autenticação real, é somente front-end."
  );

  // Redireciona para Premium só pra simular fluxo pós-login
  window.location.href = "premium.html";
  return false;
}
