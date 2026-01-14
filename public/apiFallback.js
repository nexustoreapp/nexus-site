// public/apiFallback.js
export async function safeFetch(url, options = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error("API_ERROR");

    return await res.json();

  } catch (err) {
    console.warn("⚠️ API indisponível, usando fallback");

    return {
      ok: false,
      fallback: true,
      message: "Serviço temporariamente indisponível. Tente novamente."
    };
  }
}