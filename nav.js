(function () {
  const topbar = document.getElementById("topbar");
  const toggle = document.getElementById("navToggle");

  toggle?.addEventListener("click", () => {
    topbar?.classList.toggle("open");
  });

  // Marca link ativo pelo pathname
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  document.querySelectorAll(".navlink").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    // compara só o arquivo (sem query)
    if (href.split("?")[0] === path) a.classList.add("active");
    else a.classList.remove("active");
  });
})();