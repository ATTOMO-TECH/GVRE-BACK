/**
 * Llama al webhook de Next.js para purgar el caché.
 * @param {string} tag - La etiqueta a revalidar (ej: 'home-data', 'property-slug')
 * @returns {Promise<boolean>} - Retorna true si tuvo éxito, false si falló.
 */
const revalidateWeb = async (tag) => {
  if (process.env.ENABLE_REVALIDATION !== "true") {
    console.log(
      `🟡 [Revalidate] Omitido (Next.js no conectado) para tag: '${tag}'`,
    );
    return true; // Fingimos que todo ha ido bien para no bloquear el backend
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

  if (!tag) {
    console.warn(
      "⚠️ [Revalidate] Se intentó revalidar sin especificar un tag.",
    );
    return false;
  }

  // 3. Construcción robusta de la URL
  const url = new URL("/api/revalidate", frontendUrl);
  url.searchParams.append("tag", tag);
  url.searchParams.append("secret", secret);

  // 4. Configuración de Timeout (15 segundos)
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
    console.log(`✅ [Revalidate] Correcto para el tag: '${tag}'`);
    return true;
  } catch (error) {
    if (error.name === "AbortError") {
      console.error(`❌ [Revalidate] Timeout (5s) para el tag: '${tag}'`);
    } else {
      console.error(`❌ [Revalidate] Error en '${tag}': ${error.message}`);
    }
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

module.exports = {
  revalidateWeb,
};
