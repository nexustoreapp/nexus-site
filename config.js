// config.js
window.NEXUS_API = "https://nexus-site-oufm.onrender.com/api";

window.nexusFetch = async function(url, options = {}) {
  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    "X-Nexus-Client": "web"
  };
  return fetch(url, options);
};