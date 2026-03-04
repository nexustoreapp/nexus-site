// ======================================================
// buscar.js
// Responsável por carregar produtos na página de busca
// com scroll infinito
// ======================================================

const API = window.NEXUS_API;

const results = document.getElementById("results");

let page = 1;
let loading = false;
let finished = false;

async function loadProducts(){

if(loading || finished) return;

loading = true;

const loader = document.createElement("div");
loader.innerText = "Carregando produtos...";
loader.style.marginTop = "10px";
results.appendChild(loader);

try{

const r = await fetch(`${API}/products?page=${page}`);
const data = await r.json();

loader.remove();

if(!data.ok || !data.products || !data.products.length){

finished = true;

const end = document.createElement("div");
end.innerText = "Nenhum outro produto.";
end.style.marginTop = "10px";
results.appendChild(end);

return;
}

data.products.forEach(p=>{

const card = document.createElement("div");

card.className = "soft";
card.style.padding = "14px";
card.style.marginBottom = "10px";

card.innerHTML = `
<h3 style="font-weight:1000;">${p.title}</h3>

<p style="margin-top:6px;color:#9ca3af;">
${p.description || ""}
</p>

<div style="margin-top:10px;">
<a href="produto.html?id=${p.id}" class="btn btn-outline">
Ver produto
</a>
</div>
`;

results.appendChild(card);

});

page++;

}catch(err){

console.error("Erro buscar produtos",err);

}

loading = false;

}

// Scroll infinito
window.addEventListener("scroll",()=>{

if(
window.innerHeight + window.scrollY
>= document.body.offsetHeight - 200
){
loadProducts();
}

});

// Primeira carga
loadProducts();