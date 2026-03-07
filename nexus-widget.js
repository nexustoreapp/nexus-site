(function(){

const API = window.NEXUS_API;

function createWidget(){

if(document.getElementById("nexus-ia-widget")) return;

const wrap = document.createElement("div");

wrap.id="nexus-ia-widget";

wrap.innerHTML=`

<button id="nexus-ia-fab">

<svg width="26" height="26" viewBox="0 0 24 24" fill="none">
<path d="M4 4H20V15H7L4 18V4Z"
stroke="white"
stroke-width="2"
stroke-linecap="round"
stroke-linejoin="round"/>
</svg>

</button>

<div id="nexus-ia-panel">

<div id="nexus-ia-header">

<div id="nexus-ia-title">

Nayla

</div>

<button id="nexus-ia-close">✕</button>

</div>

<div id="nexus-ia-body"></div>

<div id="nexus-ia-footer">

<input id="nexus-ia-input" placeholder="Fale com a Nayla..." />

<button id="nexus-ia-send">Enviar</button>

</div>

</div>

`;

document.body.appendChild(wrap);

const fab = wrap.querySelector("#nexus-ia-fab");
const panel = wrap.querySelector("#nexus-ia-panel");
const body = wrap.querySelector("#nexus-ia-body");
const input = wrap.querySelector("#nexus-ia-input");
const sendBtn = wrap.querySelector("#nexus-ia-send");
const closeBtn = wrap.querySelector("#nexus-ia-close");

function addMsg(text,who="bot"){

const row=document.createElement("div");
row.className="nx-msg "+(who==="user"?"user":"bot");

const bubble=document.createElement("div");
bubble.className="nx-bubble";
bubble.textContent=text;

row.appendChild(bubble);

body.appendChild(row);

body.scrollTop=body.scrollHeight;

}

async function send(){

const msg=(input.value||"").trim();

if(!msg) return;

input.value="";

addMsg(msg,"user");

addMsg("Digitando...","bot");

const typing=body.lastChild;

try{

const r=await fetch(`${API}/chat`,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({message:msg})

});

const d=await r.json();

typing.remove();

if(!d?.ok){

addMsg("Erro ao falar com Nayla.","bot");
return;

}

addMsg(d.reply,"bot");

}catch{

typing.remove();

addMsg("Erro de conexão.","bot");

}

}

fab.onclick=()=>panel.classList.toggle("open");

closeBtn.onclick=()=>panel.classList.remove("open");

sendBtn.onclick=send;

input.addEventListener("keydown",(e)=>{

if(e.key==="Enter") send();

});

addMsg("Oi! Eu sou a Nayla 👋");

}

if(document.readyState==="loading"){

document.addEventListener("DOMContentLoaded",createWidget);

}else{

createWidget();

}

})();