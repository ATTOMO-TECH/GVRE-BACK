// API pública del módulo de traducciones. El resto de la aplicación importa
// desde aquí, no desde los ficheros internos.

const config = require("./config");
const { ENTITIES, getTranslatableFields } = require("./translatableFields");
const {
  TRANSLATION_STATUS,
  TRANSLATIONS_KEY,
  buildTranslationPath,
} = require("./translationEntry");
const { buildTranslationsDefinition } = require("./translationSchema");
const {
  getTranslatedLangs,
  getLocalizedValue,
  localizeDocument,
  omitTranslations,
  withTranslationStatus,
} = require("./localize");
const {
  TranslationInputError,
  parseTranslationsInput,
  parseConfirmedInput,
  parseAutoInput,
  planTranslationWrites,
  toMongoUpdate,
  applyWritesToDocument,
} = require("./translationWrites");
const { translateLabel, translateLabels } = require("./labels");

module.exports = {
  DEFAULT_LANG: config.DEFAULT_LANG,
  TRANSLATION_LANGS: config.TRANSLATION_LANGS,
  isTranslationLang: config.isTranslationLang,
  isSupportedLang: config.isSupportedLang,
  getLanguageName: config.getLanguageName,

  ENTITIES,
  TRANSLATION_STATUS,
  TRANSLATIONS_KEY,
  buildTranslationPath,
  getTranslatableFields,
  buildTranslationsDefinition,

  getTranslatedLangs,
  getLocalizedValue,
  localizeDocument,
  omitTranslations,
  withTranslationStatus,

  TranslationInputError,
  parseTranslationsInput,
  parseConfirmedInput,
  parseAutoInput,
  planTranslationWrites,
  toMongoUpdate,
  applyWritesToDocument,

  translateLabel,
  translateLabels,
};
