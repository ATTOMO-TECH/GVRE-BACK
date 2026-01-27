/**
 * Llama al webhook de Next.js para purgar el caché usando fetch nativo
 * @param {string} tag - La etiqueta a revalidar (ej: 'home-data')
 */

const revalidateWeb = async (tag = "home-data") => {
  const frontendUrl = process.env.FRONTEND_URL;
  const secret = process.env.REVALIDATE_TOKEN;

  if (!frontendUrl || !secret) {
    console.error(
      "⚠️ Faltan variables de entorno FRONTEND_URL o REVALIDATE_TOKEN",
    );
    return;
  }

  // 1. Construimos la URL con parámetros de forma segura
  const url = new URL(`${frontendUrl}/api/revalidate`);
  url.searchParams.append("tag", tag);
  url.searchParams.append("secret", secret);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    if (error.name === "AbortError") {
      console.error(
        "❌ Error: La petición de revalidación excedió el tiempo límite (timeout).",
      );
    } else {
      console.error("❌ Error al revalidar Next.js:", error.message);
    }
  } finally {
    // Importante: Limpiamos el temporizador para no dejar procesos colgados
    clearTimeout(timeoutId);
  }
};

module.exports = {
  revalidateWeb,
};
