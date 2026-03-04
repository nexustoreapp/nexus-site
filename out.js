(function () {

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

logoutBtn.onclick = () => {

localStorage.removeItem("nexus_token");
localStorage.removeItem("nexus_plan");

window.location.href = "index.html";

};

}

})();