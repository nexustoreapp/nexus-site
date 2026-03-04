const API = window.NEXUS_API;

const PLAN_KEY = "nexus_user_plan";

function getUserPlan() {
  const p = (localStorage.getItem(PLAN_KEY) || "").toLowerCase().trim();
  return p || "free";
}

function planRank(plan) {
  if (plan === "omega") return 4;
  if (plan === "hyper") return 3;
  if (plan === "core") return 2;
  return 1;
}

function tierLabel(tier) {
  const t = (tier || "free").toLowerCase();

  if (t === "omega") return "Conteúdo OMEGA";
  if (t === "hyper") return "Conteúdo HYPER";
  if (t === "core") return "Conteúdo CORE";

  return "";
}

function formatBRL(n) {
  try {
    return Number(n).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  } catch {
    return `R$ ${n}`;
  }
}

function getIdFromUrl() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("id") || "").trim();
}

const titleEl = document.getElementById("product-title");
const subtitleEl = document.getElementById("product-subtitle");
const flagsEl = document.getElementById("product-flags");
const pricePublicEl = document.getElementById("product-price-public");
const pricePremiumEl = document.getElementById("product-price-premium");
const categoryEl = document.getElementById("product-category");
const tagsEl = document.getElementById("product-tags");
const stockEl = document.getElementById("product-stock");
const descEl = document.getElementById("product-description");
const shipEl = document.getElementById("product-shipping-info");
const imgMain = document.getElementById("product-image-main");
const thumbsEl = document.getElementById("product-thumbs");

const buyBtn = document.getElementById("btn-buy");
const plansBtn = document.getElementById("btn-see-plans");

function renderFlags(p) {
  const badge = tierLabel(p.accessTier);
  flagsEl.innerHTML = badge ? `<span class="badge badge-tier">${badge}</span>` : "";
}

function renderTags(p) {
  tagsEl.innerHTML = "";

  (p.tags || []).slice(0, 8).forEach((t) => {
    const s = document.createElement("span");
    s.className = "badge";
    s.textContent = t;
    tagsEl.appendChild(s);
  });
}

function renderImages(p) {
  const imgs = (p.images || []).filter(Boolean);
  const main = imgs[0] || "logo.png";

  imgMain.src = main;

  thumbsEl.innerHTML = "";

  imgs.slice(0, 6).forEach((src) => {

    const b = document.createElement("button");

    b.type = "button";
    b.className = "chip";
    b.textContent = "Ver";

    b.onclick = () => imgMain.src = src;

    thumbsEl.appendChild(b);
  });
}

function setLockedState(locked) {

  if (locked) {

    buyBtn.textContent = "Ver planos para desbloquear";

    buyBtn.onclick = () => {
      window.location.href = "assinatura.html";
    };

    plansBtn.style.display = "none";

  } else {

    buyBtn.textContent = "Comprar agora";

    buyBtn.onclick = () => {
      alert("Checkout entra no próximo passo 🙂");
    };

    plansBtn.style.display = "inline-flex";

    plansBtn.onclick = () => {
      window.location.href = "assinatura.html";
    };
  }
}

async function loadProduct() {

  const id = getIdFromUrl();

  if (!id) {
    titleEl.textContent = "Produto inválido.";
    return;
  }

  try {

    const plan = getUserPlan();

    const resp = await fetch(`${API}/product?id=${encodeURIComponent(id)}&plan=${encodeURIComponent(plan)}`);

    const data = await resp.json();

    if (!data.ok || !data.product) {

      titleEl.textContent = "Produto não encontrado.";
      return;
    }

    const p = data.product;

    const userRank = planRank(plan);

    const required = planRank((p.accessTier || "free").toLowerCase());

    const locked = userRank < required;

    titleEl.textContent = p.title || "Produto";

    subtitleEl.textContent = p.subtitle || "";

    renderFlags(p);

    pricePublicEl.textContent = `Preço: ${formatBRL(p.pricePublic ?? p.price ?? 0)}`;

    pricePremiumEl.textContent = "";

    categoryEl.textContent = p.category ? `Categoria: ${p.category}` : "";

    stockEl.textContent = p.stock ? `Estado: ${p.stock}` : "";

    renderTags(p);

    renderImages(p);

    descEl.textContent = p.description || "Sem descrição.";

    shipEl.innerHTML = `<p>Frete e entrega: a confirmar com fornecedor.</p>`;

    setLockedState(locked);

  } catch (e) {

    console.error(e);

    titleEl.textContent = "Erro ao conectar com servidor.";
  }
}

loadProduct();