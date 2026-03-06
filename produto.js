// produto.js

const API = window.NEXUS_API;

function getToken() {
  return localStorage.getItem("nexus_token") || "";
}

function parseToken() {
  const token = getToken();
  if (!token) return null;

  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

function getUserPlan() {
  const user = parseToken();
  return (user?.plan || "free").toLowerCase();
}

function formatBRL(n) {
  return Number(n || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function getSkuFromUrl() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("sku") || "").trim();
}

function qs(id) {
  return document.getElementById(id);
}

function renderProduct(p, locked) {
  qs("product-title").textContent = p.title || "Produto";
  qs("product-subtitle").textContent = p.subtitle || "";
  qs("product-price-public").textContent = `Preço: ${formatBRL(p.pricePublic ?? p.price)}`;
  qs("product-category").textContent = p.category ? `Categoria: ${p.category}` : "";
  qs("product-stock").textContent = p.stock ? `Estado: ${p.stock}` : "";
  qs("product-description").textContent = p.description || "Sem descrição.";
  qs("product-image-main").src = p.image || (p.images && p.images[0]) || "logo.png";

  const flagsEl = qs("product-flags");
  flagsEl.innerHTML = `
    <span class="badge">${(p.accessTier || "free").toUpperCase()}</span>
    ${locked
      ? `<span class="badge" style="background:#3a0f16;color:#ffb3bf;">🔒 Bloqueado hoje</span>`
      : `<span class="badge" style="background:#0f2a1b;color:#9ef0b8;">✅ Liberado hoje</span>`}
  `;

  const tagsEl = qs("product-tags");
  tagsEl.innerHTML = "";
  (p.tags || []).slice(0, 8).forEach((tag) => {
    const s = document.createElement("span");
    s.className = "badge";
    s.textContent = tag;
    tagsEl.appendChild(s);
  });

  const thumbsEl = qs("product-thumbs");
  thumbsEl.innerHTML = "";

  const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  images.slice(0, 6).forEach((src) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = "Ver";
    b.onclick = () => {
      qs("product-image-main").src = src;
    };
    thumbsEl.appendChild(b);
  });

  const buyBtn = qs("btn-buy");
  const plansBtn = qs("btn-see-plans");

  if (locked) {
    buyBtn.textContent = "Produto bloqueado pelo plano";
    buyBtn.disabled = true;
    plansBtn.style.display = "inline-flex";
    plansBtn.onclick = () => {
      window.location.href = "assinatura.html";
    };
  } else {
    buyBtn.disabled = false;
    buyBtn.textContent = "Comprar agora";

    /* =========================
       INICIO_TESTE_CHECKOUT_1_CENTAVO
       guarda o SKU e manda para o checkout do core_test
       ========================= */
    buyBtn.onclick = () => {
      localStorage.setItem("nexus_product_intent", p.sku);
      window.location.href = `checkout.html?plan=core_test&sku=${encodeURIComponent(p.sku)}`;
    };
    /* =========================
       FIM_TESTE_CHECKOUT_1_CENTAVO
       ========================= */

    plansBtn.style.display = "inline-flex";
    plansBtn.onclick = () => {
      window.location.href = "assinatura.html";
    };
  }
}

async function loadProduct() {
  const sku = getSkuFromUrl();

  if (!sku) {
    qs("product-title").textContent = "Produto inválido.";
    return;
  }

  try {
    const plan = getUserPlan();
    const headers = {};
    const token = getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const resp = await fetch(
      `${API}/products/${encodeURIComponent(sku)}?plan=${encodeURIComponent(plan)}`,
      { headers }
    );

    const data = await resp.json();

    if (!data.ok || !data.product) {
      qs("product-title").textContent = "Produto não encontrado.";
      return;
    }

    renderProduct(data.product, data.locked === true || data.product.blocked === true);
  } catch (e) {
    console.error(e);
    qs("product-title").textContent = "Erro ao conectar com servidor.";
  }
}

loadProduct();