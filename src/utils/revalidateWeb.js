/**
 * Llama al webhook de Next.js para purgar el caché (soporta batching).
 * @param {string|string[]} tags - Etiqueta o conjunto de etiquetas a revalidar (ej: 'home-data', ['ads-list', 'property-slug'])
 * @returns {Promise<boolean>} - Retorna true si tuvo éxito, false si falló.
 */
const revalidateWeb = async (tags) => {
  // 1. Normalizamos la entrada para trabajar siempre con un Array
  const tagsArray = Array.isArray(tags) ? tags : [tags].filter(Boolean);

  if (process.env.ENABLE_REVALIDATION !== "true") {
    console.log(
      `🟡 [Revalidate] Omitido (Next.js no conectado) para tags: '${tagsArray.join(",")}'`,
    );
    return true;
  }

  const frontendUrl = process.env.FRONTEND_URL;
  const secret = process.env.REVALIDATE_TOKEN;

  // 2. Validación temprana
  if (!frontendUrl || !secret) {
    console.error(
      "⚠️ [Revalidate] Faltan variables de entorno FRONTEND_URL o REVALIDATE_TOKEN",
    );
    return false;
  }

  if (tagsArray.length === 0) {
    console.warn(
      "⚠️ [Revalidate] Se intentó revalidar sin especificar tags válidos.",
    );
    return false;
  }

  // 3. Construcción robusta de la URL
  const url = new URL("/api/revalidate", frontendUrl);
  // Enviamos el array como un string separado por comas bajo el parámetro "tags"
  url.searchParams.append("tags", tagsArray.join(","));
  url.searchParams.append("secret", secret);

  // 4. Configuración de Timeout (5 segundos sigue estando perfecto)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        `Status ${response.status}: ${data.message || response.statusText}`,
      );
    }
    console.log(
      `✅ [Revalidate] Correcto para los tags: '${tagsArray.join(",")}'`,
    );
    return true;
  } catch (error) {
    if (error.name === "AbortError") {
      console.error(
        `❌ [Revalidate] Timeout (5s) para los tags: '${tagsArray.join(",")}'`,
      );
    } else {
      console.error(
        `❌ [Revalidate] Error en '${tagsArray.join(",")}': ${error.message}`,
      );
    }
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

module.exports = {
  revalidateWeb,
};
