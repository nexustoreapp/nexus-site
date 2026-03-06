// produto.js

const API = "https://nexus-site-oufm.onrender.com";

function getToken(){
  return localStorage.getItem("token");
}

function getSku(){

  const params = new URLSearchParams(window.location.search);

  return params.get("sku");

}

async function loadProduct(){

  const sku = getSku();

  if(!sku) return;

  const r = await fetch(`${API}/api/products/${sku}`);

  const data = await r.json();

  if(!data.ok) return;

  const p = data.product;

  document.getElementById("produto-nome").innerText = p.name || p.title;
  document.getElementById("produto-preco").innerText = `R$ ${p.price}`;

  window.__PRODUCT__ = p;

}

async function comprar(){

  const token = getToken();

  if(!token){

    alert("Faça login primeiro");

    return;

  }

  const product = window.__PRODUCT__;

  if(!product) return;

  /* =========================
     PASSO 1
     PREPARAR CHECKOUT
  ========================= */

  const r = await fetch(`${API}/api/v1/checkout/prepare`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":`Bearer ${token}`
    },
    body:JSON.stringify({
      sku:product.sku,
      price:product.price
    })
  });

  const data = await r.json();

  if(!data.ok){

    alert(data.error || "Erro no checkout");

    return;

  }

  const orderId = data.orderId;

  /* =========================
     PASSO 2
     CRIAR PAGAMENTO
  ========================= */

  const pay = await fetch(`${API}/api/v1/payment/create`,{

    method:"POST",

    headers:{
      "Content-Type":"application/json",
      "Authorization":`Bearer ${token}`
    },

    body:JSON.stringify({

      amountCents: Math.round(product.price * 100),

      items:[
        {
          id:product.sku,
          title:product.name || product.title,
          quantity:1,
          unit_price:product.price
        }
      ],

      orderId

    })

  });

  const payData = await pay.json();

  if(!payData.ok){

    alert("Erro pagamento");

    return;

  }

  /* =========================
     PASSO 3
     REDIRECIONAR MP
  ========================= */

  window.location.href = payData.init_point;

}

document.addEventListener("DOMContentLoaded",()=>{

  loadProduct();

  const btn = document.getElementById("btn-comprar");

  if(btn){
    btn.addEventListener("click",comprar);
  }

});