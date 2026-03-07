// nexus-widget.js
// ==========================================
// WIDGET GLOBAL DA NAYLA
// aparece em TODAS as páginas
// ==========================================

(function(){

const POS_KEY="nexus_widget_pos";

/* ===============================
CRIAR WIDGET
=============================== */

function createWidget(){

if(document.getElementById("nexus-widget")) return;

const wrap=document.createElement("div");
wrap.id="nexus-widget";

wrap.innerHTML=`

<button id="nexus-fab">

<svg viewBox="0 0 24 24" width="22" height="22">
<path fill="white"
d="M4 4h16v11H7l-3 3z"/>
</svg>

</button>

<div id="nexus-panel">

<div id="nexus-header">

<div class="title">
Nayla
<span class="badge">Assistente Nexus</span>
</div>

<button id="nexus-close">✕</button>

</div>

<div id="nexus-body"></div>

<div id="nexus-footer">

<input id="nexus-input"
placeholder="Fale com a Nayla..."/>

<button id="nexus-send">
Enviar
</button>

</div>

</div>
`;

document.body.appendChild(wrap);

const fab=wrap.querySelector("#nexus-fab");
const panel=wrap.querySelector("#nexus-panel");
const closeBtn=wrap.querySelector("#nexus-close");
const body=wrap.querySelector("#nexus-body");
const input=wrap.querySelector("#nexus-input");
const sendBtn=wrap.querySelector("#nexus-send");



/* ===============================
ABRIR / FECHAR
=============================== */

function open(){

panel.classList.add("open");
fab.style.display="none";

input.focus();

}

function close(){

panel.classList.remove("open");
fab.style.display="flex";

}

fab.onclick=open;
closeBtn.onclick=close;



/* ===============================
MENSAGENS
=============================== */

function addMsg(text,who){

const row=document.createElement("div");
row.className="nx-row "+who;

const bubble=document.createElement("div");
bubble.className="nx-bubble";
bubble.textContent=text;

row.appendChild(bubble);
body.appendChild(row);

body.scrollTop=body.scrollHeight;

}



/* ===============================
ENVIO PARA IA
=============================== */

async function send(){

const msg=input.value.trim();

if(!msg) return;

input.value="";

addMsg(msg,"user");

addMsg("Digitando...","bot");

const typing=body.lastChild;

try{

const api=window.NEXUS_API;

const r=await fetch(`${api}/chat`,{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
message:msg
})

});

const data=await r.json();

typing.remove();

if(!data.ok){

addMsg("Erro ao falar com a Nayla.","bot");
return;

}

addMsg(data.reply,"bot");

}catch(e){

typing.remove();

addMsg("Falha de conexão com a IA.","bot");

}

}

sendBtn.onclick=send;

input.addEventListener("keydown",e=>{

if(e.key==="Enter") send();

});


/* ===============================
MENSAGEM INICIAL
=============================== */

addMsg(
"Olá! Eu sou a Nayla da Nexus.\nComo posso ajudar você hoje?",
"bot"
);

}



/* ===============================
INICIAR
=============================== */

if(document.readyState==="loading"){

document.addEventListener("DOMContentLoaded",createWidget);

}else{

createWidget();

}

})();