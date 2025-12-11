// produto.js

function formatPrice(valor) {
  if (typeof valor !== "number") return "-";
  return "R$ " + valor.toFixed(2).replace(".", ",");
}

function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function renderProduct(product) {
  // Título, subtítulo
  const titleEl = document.getElementById("product-title");
  const subtitleEl = document.getElementById("product-subtitle");
  const descEl = document.getElementById("product-description");

  const imgMainEl = document.getElementById("product-image-main");
  const thumbsEl = document.getElementById("product-thumbs");

  const flagsEl = document.getElementById("product-flags");
  const pricePublicEl = document.getElementById("product-price-public");
  const pricePremiumEl = document.getElementById("product-price-premium");

  const categoryEl = document.getElementById("product-category");
  const tagsEl = document.getElementById("product-tags");
  const stockEl = document.getElementById("product-stock");
  const shippingInfoEl = document.getElementById("product-shipping-info");

  if (titleEl) titleEl.textContent = product.title || "Produto Nexus";
  if (subtitleEl) subtitleEl.textContent = product.subtitle || "";
  if (descEl) descEl.textContent = product.description || "Descrição não disponível.";

  // Imagens
  const images = product.images && product.images.length ? product.images : ["logo.png"];
  if (imgMainEl) {
    imgMainEl.src = images[0];
    imgMainEl.alt = product.title || "Produto Nexus";
  }
  if (thumbsEl) {
    thumbsEl.innerHTML = "";
    images.forEach((src, idx) => {
      const thumb = document.createElement("img");
      thumb.src = src;
      thumb.alt = product.title || "Produto Nexus";
      thumb.className = "product-thumb";
      thumb.addEventListener("click", () => {
        imgMainEl.src = src;
      });
      thumbsEl.appendChild(thumb);
    });
  }

  // Flags (premium / omega)
  if (flagsEl) {
    const flags = [];
    if (product.premiumOnly) {
      flags.push(`<span class="flag flag-premium">Exclusivo Nexus+</span>`);
    }
    if (product.omegaExclusive) {
      flags.push(`<span class="flag flag-omega">Omega Exclusive</span>`);
    }
    flagsEl.innerHTML = flags.join("");
  }

  // Preços
  if (pricePublicEl) {
    pricePublicEl.textContent = product.pricePublic
      ? `Preço público: ${formatPrice(product.pricePublic)}`
      : "";
  }
  if (pricePremiumEl) {
    pricePremiumEl.innerHTML = product.pricePremium
      ? `Preço Nexus+: ${formatPrice(product.pricePremium)} <span class="price-premium-badge">Nexus+</span>`
      : "";
  }

  // Categoria, tags, estoque
  if (categoryEl) {
    categoryEl.textContent = product.category
      ? `Categoria: ${product.category}`
      : "";
  }

  if (tagsEl) {
    if (product.tags && product.tags.length) {
      tagsEl.innerHTML = product.tags
        .map((tag) => `<span class="tag-pill">${tag}</span>`)
        .join("");
    } else {
      tagsEl.innerHTML = "";
    }
  }

  if (stockEl) {
    const estoque = product.stock ?? 0;
    stockEl.textContent =
      estoque > 0
        ? `Estoque disponível: ${estoque} unidade(s)`
        : "Produto esgotado no momento.";
  }

  // Frete / entrega
  if (shippingInfoEl) {
    const shipping = product.shipping || {};
    const supplier = product.supplier || {};

    const baseShipping =
      typeof shipping.baseShipping === "number"
        ? formatPrice(shipping.baseShipping)
        : "a calcular no carrinho";

    const freeHyper =
      typeof shipping.freeForHyperOver === "number"
        ? `Nexus Hyper: frete grátis a partir de ${formatPrice(
            shipping.freeForHyperOver
          )}`
        : "Nexus Hyper: condições especiais de frete.";

    const freeOmega = shipping.freeForOmega
      ? "Nexus Omega: frete grátis em todas as compras elegíveis."
      : "Nexus Omega: frete reduzido em relação ao plano Free.";

    const prazo = supplier.deliveryTime
      ? `Prazo estimado: ${supplier.deliveryTime}.`
      : "";

    shippingInfoEl.innerHTML = `
      <p>Frete base (plano Free): ${baseShipping}</p>
      <p>${freeHyper}</p>
      <p>${freeOmega}</p>
      <p>${prazo}</p>
    `;
  }
}

async function carregarProduto() {
  const id = getProductIdFromUrl();
  const section = document.getElementById("product-section");

  if (!id) {
    if (section) {
      section.innerHTML = `
        <div class="section-header">
          <h1>Produto não encontrado</h1>
          <p>O link está sem ID de produto. Volte para a página inicial e tente novamente.</p>
        </div>
      `;
    }
    return;
  }

  try {
    const resp = await fetch(`http://localhost:3000/api/product/${encodeURIComponent(id)}`);
    const data = await resp.json();

    if (!data.ok || !data.product) {
      if (section) {
        section.innerHTML = `
          <div class="section-header">
            <h1>Produto não encontrado</h1>
            <p>Não encontramos esse produto no catálogo Nexus.</p>
          </div>
        `;
      }
      return;
    }

    renderProduct(data.product);
  } catch (erro) {
    console.error("Erro ao carregar produto:", erro);
    if (section) {
      section.innerHTML = `
        <div class="section-header">
          <h1>Erro ao carregar produto</h1>
          <p>Não foi possível conectar ao servidor Nexus. Tente novamente mais tarde.</p>
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", carregarProduto);
