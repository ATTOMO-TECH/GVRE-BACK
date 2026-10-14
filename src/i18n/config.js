// Idiomas de la web pública.
//
// El español es el idioma de origen: sus textos viven en los campos de siempre
// de cada modelo y nunca se guardan dentro de `translations`. El resto de
// idiomas se declaran aquí; añadir uno nuevo es añadir su código a
// TRANSLATION_LANGS (y su nombre a LANGUAGE_NAMES), sin tocar modelos ni
// controladores.

const DEFAULT_LANG = "es";

const LANGUAGE_NAMES = {
  es: "Español",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  ru: "Русский",
};

const FALLBACK_TRANSLATION_LANGS = ["en", "fr", "de"];

const parseLangList = (raw) => {
  if (typeof raw !== "string" || raw.trim() === "") return null;

  const langs = raw
    .split(",")
    .map((code) => code.trim().toLowerCase())
    .filter((code) => /^[a-z]{2}$/.test(code) && code !== DEFAULT_LANG);

  return langs.length > 0 ? [...new Set(langs)] : null;
};

// Idiomas a los que se traduce el contenido (no incluye el español)
const TRANSLATION_LANGS = Object.freeze(
  parseLangList(process.env.TRANSLATION_LANGS) || FALLBACK_TRANSLATION_LANGS,
);

const isTranslationLang = (lang) => TRANSLATION_LANGS.includes(lang);

const isSupportedLang = (lang) =>
  lang === DEFAULT_LANG || isTranslationLang(lang);

const getLanguageName = (lang) => LANGUAGE_NAMES[lang] || lang.toUpperCase();

module.exports = {
  DEFAULT_LANG,
  TRANSLATION_LANGS,
  isTranslationLang,
  isSupportedLang,
  getLanguageName,
  parseLangList,
};
