// Proveedor de traducción automática: DeepL (API v2).
//
// Se activa con la variable de entorno DEEPL_API_KEY (la cuenta es del
// cliente). Las claves de la versión gratuita terminan en ":fx" y usan otro
// dominio; DEEPL_API_URL permite forzarlo si hiciera falta.

const SOURCE_LANG = "ES";

// Idioma de la web → idioma de destino de DeepL
const TARGET_LANGS = {
  en: "EN-GB",
  fr: "FR",
  de: "DE",
  it: "IT",
  pt: "PT-PT",
  nl: "NL",
  ru: "RU",
};

// DeepL admite hasta 50 textos por petición
const MAX_TEXTS_PER_REQUEST = 50;
const REQUEST_TIMEOUT_MS = 20_000;

class MachineTranslationError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = "MachineTranslationError";
    this.statusCode = statusCode;
  }
}

const getApiKey = () => (process.env.DEEPL_API_KEY || "").trim();

const isConfigured = () => getApiKey() !== "";

const getBaseUrl = () =>
  process.env.DEEPL_API_URL ||
  (getApiKey().endsWith(":fx")
    ? "https://api-free.deepl.com"
    : "https://api.deepl.com");

// Mensaje claro para el CRM según la respuesta de DeepL
const describeHttpError = (status) => {
  if (status === 403) return "La clave de DeepL no es válida.";
  if (status === 456) return "Se ha agotado la cuota de caracteres de DeepL.";
  if (status === 429) return "DeepL está recibiendo demasiadas peticiones. Inténtalo en un momento.";
  return `DeepL ha respondido con un error (${status}).`;
};

const requestTranslations = async (texts, { targetLang, html }) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getBaseUrl()}/v2/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: texts,
        source_lang: SOURCE_LANG,
        target_lang: targetLang,
        preserve_formatting: true,
        ...(html && { tag_handling: "html" }),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new MachineTranslationError(describeHttpError(response.status));
    }

    const data = await response.json();
    return (data.translations || []).map((item) => item.text);
  } catch (error) {
    if (error instanceof MachineTranslationError) throw error;
    if (error.name === "AbortError") {
      throw new MachineTranslationError("DeepL no ha respondido a tiempo.", 504);
    }
    throw new MachineTranslationError("No se ha podido conectar con DeepL.");
  } finally {
    clearTimeout(timeoutId);
  }
};

// Traduce una lista de textos del español a `lang`, en el mismo orden.
// `html: true` conserva las etiquetas (descripciones con formato).
const translate = async (texts, { lang, html = false }) => {
  const targetLang = TARGET_LANGS[lang];
  if (!targetLang) {
    throw new MachineTranslationError(`DeepL no admite el idioma "${lang}".`, 400);
  }

  const results = [];
  for (let i = 0; i < texts.length; i += MAX_TEXTS_PER_REQUEST) {
    const chunk = texts.slice(i, i + MAX_TEXTS_PER_REQUEST);
    results.push(...(await requestTranslations(chunk, { targetLang, html })));
  }
  return results;
};

module.exports = {
  name: "DeepL",
  isConfigured,
  translate,
  MachineTranslationError,
};
