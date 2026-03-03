async function loadTopbar(){

const response = await fetch("/topbar.html");

const html = await response.text();

document.getElementById("topbar-container").innerHTML = html;

updateTopbar();

}

document.addEventListener("DOMContentLoaded", loadTopbar);