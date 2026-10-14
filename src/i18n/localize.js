// Lado de lectura: resuelve qué texto se muestra en cada idioma.
//
// Regla de reserva, campo a campo: si hay traducción se usa la traducción; si
// no, se devuelve el español. Así la web nunca enseña huecos aunque una ficha
// esté a medio traducir.
//
// Todas las funciones esperan objetos planos (`.lean()` o `.toObject()`) y no
// modifican lo que reciben.

const { DEFAULT_LANG, TRANSLATION_LANGS, isTranslationLang } = require("./config");
const { getPath, setPath } = require("./objectPath");
const { isBlank } = require("./fieldValues");
const { hashSourceValue } = require("./sourceHash");
const {
  FIELD_TYPES,
  getTranslatableFields,
  findTranslatableField,
} = require("./translatableFields");
const { TRANSLATIONS_KEY, buildTranslationPath } = require("./translationEntry");

// Si el español está vacío no se muestra nada, aunque quede una traducción
// antigua guardada: el contenido lo decide siempre el texto de origen.
const pickText = (source, translated) =>
  isBlank(source) || isBlank(translated) ? source : translated;

const isAlignedList = (source, translated) =>
  Array.isArray(source) &&
  Array.isArray(translated) &&
  source.length === translated.length;

const translateRow = (row, translatedRow, rowFields) =>
  rowFields.reduce(
    (result, key) => ({
      ...result,
      [key]: pickText(row?.[key], translatedRow?.[key]),
    }),
    { ...row },
  );

const translateValue = (field, source, translated) => {
  switch (field.type) {
    case FIELD_TYPES.TEXT_LIST:
      // Una lista que ya no encaja con la española (se añadieron o quitaron
      // elementos) no se puede emparejar con seguridad: se devuelve el español.
      return isAlignedList(source, translated)
        ? source.map((item, index) => pickText(item, translated[index]))
        : source;

    case FIELD_TYPES.ROW_LIST:
      return isAlignedList(source, translated)
        ? source.map((row, index) =>
            translateRow(row, translated[index], field.rowFields),
          )
        : source;

    default:
      return pickText(source, translated);
  }
};

const resolveField = (field, doc, lang) => {
  const source = getPath(doc, field.path);
  if (!isTranslationLang(lang)) return source;

  const entry = getPath(doc, buildTranslationPath(lang, field.path));
  return translateValue(field, source, entry?.value);
};

// Valor de un campo concreto en el idioma pedido.
const getLocalizedValue = (entity, doc, path, lang) => {
  const field = findTranslatableField(entity, path);
  if (!field) throw new Error(`Campo no traducible: ${entity}.${path}`);

  return resolveField(field, doc, lang);
};

const omitTranslations = (doc) => {
  if (!doc || typeof doc !== "object") return doc;

  const { [TRANSLATIONS_KEY]: _omitted, ...rest } = doc;
  return rest;
};

// Copia del documento con todos sus campos traducibles en el idioma pedido y
// sin el bloque `translations`, lista para devolver a la web pública.
const localizeDocument = (entity, doc, lang = DEFAULT_LANG) => {
  if (!doc || typeof doc !== "object") return doc;

  const base = omitTranslations(doc);
  if (!isTranslationLang(lang)) return base;

  return getTranslatableFields(entity).reduce((localized, field) => {
    const source = getPath(doc, field.path);
    if (source === undefined || source === null) return localized;

    const resolved = resolveField(field, doc, lang);
    return resolved === source
      ? localized
      : setPath(localized, field.path, resolved);
  }, base);
};

// Copia del documento en la que cada traducción guardada lleva `outdated`:
// true cuando el español ha cambiado desde que se tradujo. Es lo que consume
// el CRM para avisar de qué hay que revisar.
const withTranslationStatus = (entity, doc) => {
  if (!doc || typeof doc !== "object" || !doc[TRANSLATIONS_KEY]) return doc;

  const fields = getTranslatableFields(entity);

  return TRANSLATION_LANGS.reduce(
    (annotated, lang) =>
      fields.reduce((current, field) => {
        const entryPath = buildTranslationPath(lang, field.path);
        const entry = getPath(doc, entryPath);
        if (!entry || typeof entry !== "object") return current;

        const sourceHash = hashSourceValue(field, getPath(doc, field.path));

        return setPath(current, entryPath, {
          ...entry,
          outdated: entry.sourceHash !== sourceHash,
        });
      }, annotated),
    doc,
  );
};

// Idiomas en los que el contenido principal de un documento está traducido.
// `mainPaths` son los campos que definen ese contenido (p. ej. título y
// descripción de un anuncio): un idioma cuenta como traducido cuando todos los
// que tienen texto en español tienen también traducción.
//
// La web lo usa para el SEO: solo anuncia a los buscadores las versiones que
// existen de verdad en cada idioma.
const getTranslatedLangs = (entity, doc, mainPaths) => {
  const fieldsWithSource = mainPaths
    .map((path) => findTranslatableField(entity, path))
    .filter((field) => field && !isBlank(getPath(doc, field.path)));

  if (fieldsWithSource.length === 0) return [];

  return TRANSLATION_LANGS.filter((lang) =>
    fieldsWithSource.every(
      (field) =>
        !isBlank(getPath(doc, buildTranslationPath(lang, field.path))?.value),
    ),
  );
};

module.exports = {
  getTranslatedLangs,
  getLocalizedValue,
  localizeDocument,
  omitTranslations,
  withTranslationStatus,
};
