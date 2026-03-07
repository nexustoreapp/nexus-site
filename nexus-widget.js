// nexus-widget.js
// =========================================================
// NEXUS IA WIDGET
// =========================================================

(function () {

  const API = window.NEXUS_API;

  function createWidget() {

    if (document.getElementById("nexus-ia-widget")) return;

    const wrap = document.createElement("div");
    wrap.id = "nexus-ia-widget";

    wrap.innerHTML = `

      <button id="nexus-ia-fab" title="Falar com Nayla">
        💬
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
    const closeBtn = wrap.querySelector("#nexus-ia-close");
    const body = wrap.querySelector("#nexus-ia-body");
    const input = wrap.querySelector("#nexus-ia-input");
    const sendBtn = wrap.querySelector("#nexus-ia-send");

    function addMessage(text, who="bot") {

      const row = document.createElement("div");
      row.className = "nx-msg " + (who === "user" ? "user":"bot");

      const bubble = document.createElement("div");
      bubble.className = "nx-bubble";
      bubble.textContent = text;

      row.appendChild(bubble);
      body.appendChild(row);

      body.scrollTop = body.scrollHeight;

    }

    async function send(){

      const msg = (input.value || "").trim();
      if(!msg) return;

      input.value = "";

      addMessage(msg,"user");

      const typing = document.createElement("div");
      typing.className="nx-msg bot";
      typing.innerHTML=`<div class="nx-bubble">Digitando...</div>`;
      body.appendChild(typing);

      try{

        const r = await fetch(`${API}/chat`,{
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            message:msg
          })
        });

        const d = await r.json().catch(()=>null);

        typing.remove();

        if(!r.ok || !d?.ok){

          addMessage("Erro ao falar com a Nayla.","bot");
          return;

        }

        addMessage(d.reply || "Sem resposta.","bot");

      }
      catch(err){

        typing.remove();
        addMessage("Erro de rede.","bot");

      }

    }

    fab.onclick = ()=>{

      panel.classList.toggle("open");

    };

    closeBtn.onclick = ()=>{

      panel.classList.remove("open");

    };

    sendBtn.onclick = send;

    input.addEventListener("keydown",(e)=>{

      if(e.key==="Enter") send();

    });

    addMessage("Oi! Eu sou a Nayla 👋 Como posso ajudar?","bot");

  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",createWidget);
  }else{
    createWidget();
  }

})();