// produto.js

const API = window.NEXUS_API || "";

function getToken() {
  return localStorage.getItem("nexus_token") || "";
}

function parseToken() {

  const token = getToken();

  if (!token) return null;

  try {

    const payload = JSON.parse(atob(token.split(".")[1]));

    return payload;

  } catch {

    return null;

  }

}

async function loadProduct() {

  const params = new URLSearchParams(window.location.search);

  const sku = params.get("sku");

  if (!sku) return;

  const user = parseToken();

  const plan = user?.plan || "free";

  const r = await fetch(`${API}/api/products/${sku}?plan=${plan}`);

  const data = await r.json();

  if (!data.ok) {

    alert("Produto não encontrado");

    return;

  }

  const product = data.product;

  const locked = data.locked === true;

  document.getElementById("productTitle").textContent = product.title;

  document.getElementById("productPrice").textContent =
    "R$ " + Number(product.price).toFixed(2);

  document.getElementById("productImg").src = product.image;

  const buyBtn = document.getElementById("buyBtn");

  if (locked) {

    buyBtn.disabled = true;

    buyBtn.textContent = "Produto bloqueado pelo plano";

  } else {

    buyBtn.disabled = false;

  }

}

loadProduct();