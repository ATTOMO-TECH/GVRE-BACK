const {
  DEFAULT_LANG,
  TRANSLATION_LANGS,
  ENTITIES,
  getLanguageName,
  getTranslatableFields,
} = require("../i18n");

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
    // Todavía no hay proveedor de traducción automática conectado
    autoTranslate: { available: false },
  });
};

module.exports = { getTranslationConfig };
