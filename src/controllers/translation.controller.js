const {
  DEFAULT_LANG,
  TRANSLATION_LANGS,
  ENTITIES,
  getLanguageName,
  getTranslatableFields,
  isTranslationLang,
} = require("../i18n");
const {
  provider,
  isMachineTranslationEnabled,
  translateFields,
  MachineTranslationError,
} = require("../i18n/machineTranslation");

// Configuración de traducciones para el CRM: qué idiomas hay y qué campos de
// cada entidad se traducen. El CRM construye sus formularios a partir de esto,
// de modo que añadir un idioma o un campo no obliga a tocarlo.
const getTranslationConfig = (req, res) => {
  const entities = Object.values(ENTITIES).reduce(
    (config, entity) => ({
      ...config,
      [entity]: getTranslatableFields(entity),
    }),
    {},
  );

  return res.status(200).json({
    defaultLang: DEFAULT_LANG,
    languages: TRANSLATION_LANGS.map((code) => ({
      code,
      name: getLanguageName(code),
    })),
    entities,
    // Traducción automática: disponible cuando hay clave de DeepL
    autoTranslate: {
      available: isMachineTranslationEnabled(),
      provider: provider.name,
    },
  });
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// POST /translations/machine  { entity, lang, fields }
// Traduce con DeepL los textos en español que envía el CRM (`fields`, con la
// forma del modelo) y devuelve las traducciones con esa misma forma. No guarda
// nada: el usuario las revisa y guarda desde el formulario.
const translateWithMachine = async (req, res, next) => {
  const { entity, lang, fields } = req.body || {};

  if (!Object.values(ENTITIES).includes(entity)) {
    return res.status(400).json({ message: "Entidad no válida" });
  }
  if (!isTranslationLang(lang)) {
    return res.status(400).json({ message: "Idioma no válido" });
  }
  if (!isPlainObject(fields)) {
    return res.status(400).json({ message: "Faltan los textos a traducir" });
  }
  if (!isMachineTranslationEnabled()) {
    return res.status(503).json({
      message:
        "La traducción automática todavía no está configurada (falta la cuenta de DeepL).",
    });
  }

  try {
    const translations = await translateFields(entity, lang, fields);
    return res.status(200).json({ translations, provider: provider.name });
  } catch (error) {
    if (error instanceof MachineTranslationError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
};

module.exports = { getTranslationConfig, translateWithMachine };
