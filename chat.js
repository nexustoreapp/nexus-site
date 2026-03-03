/**
 chat.js
 IA Nexus - Chat flutuante
 funcionalidades:

 ✔ abrir/fechar
 ✔ enviar mensagem
 ✔ integração API
 ✔ chat arrastável pela tela
*/

const panel = document.getElementById("chatPanel")
const fab = document.getElementById("chatFab")
const closeBtn = document.getElementById("chatClose")

const input = document.getElementById("chatInput")
const send = document.getElementById("chatSend")
const body = document.getElementById("chatBody")

/* abrir */
fab.addEventListener("click", () => {
  panel.classList.toggle("open")
})

/* fechar */
closeBtn.addEventListener("click", () => {
  panel.classList.remove("open")
})

/* enviar mensagem */
send.addEventListener("click", sendMessage)

input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage()
})

function addMessage(text, type){

  const msg = document.createElement("div")

  msg.style.marginBottom = "8px"
  msg.style.padding = "10px"
  msg.style.borderRadius = "12px"

  if(type === "user"){
    msg.style.background = "rgba(255,43,43,.20)"
    msg.style.textAlign = "right"
  } else {
    msg.style.background = "rgba(255,255,255,.05)"
  }

  msg.innerText = text

  body.appendChild(msg)

  body.scrollTop = body.scrollHeight
}

async function sendMessage(){

  const message = input.value.trim()

  if(!message) return

  addMessage(message,"user")

  input.value = ""

  try{

    const res = await fetch(`${NEXUS_API}/chat`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify({message})
    })

    const data = await res.json()

    addMessage(data.reply || "Sem resposta","bot")

  }catch(err){

    addMessage("Erro ao conectar com IA Nexus","bot")

  }

}

/* -------------------------
   CHAT DRAGGABLE
------------------------- */

let isDragging = false
let offsetX, offsetY

panel.addEventListener("mousedown", startDrag)

function startDrag(e){

  if(e.target.tagName === "INPUT" || e.target.tagName === "BUTTON")
    return

  isDragging = true

  offsetX = e.clientX - panel.getBoundingClientRect().left
  offsetY = e.clientY - panel.getBoundingClientRect().top

}

document.addEventListener("mousemove", drag)

function drag(e){

  if(!isDragging) return

  panel.style.left = e.clientX - offsetX + "px"
  panel.style.top = e.clientY - offsetY + "px"

  panel.style.right = "auto"
  panel.style.bottom = "auto"

}

document.addEventListener("mouseup", () => {
  isDragging = false
})