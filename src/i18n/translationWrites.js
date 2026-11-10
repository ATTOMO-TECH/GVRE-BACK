// Lado de escritura: decide qué traducciones hay que guardar, conservar o
// borrar cuando el CRM guarda una entidad.
//
// El CRM envía los textos traducidos como valores planos, con la misma forma
// que los campos en español:
//
//   translations: { en: { title: "...", description: { web: "..." } } }
//
// Semántica de cada campo recibido:
//   - no viene (undefined)        → no se toca lo guardado.
//   - viene vacío ("" / null / [])→ se borra la traducción.
//   - viene igual que lo guardado → no se toca (conserva estado y huella).
//   - viene distinto              → se guarda como traducción manual.
//
// `confirmed` permite dar por buena una traducción desactualizada sin
// cambiarle el texto: { en: ["title", "description.web"] }.
//
// `auto` indica los campos cuyo texto viene del traductor automático (DeepL)
// sin retocar: { en: ["title"] }. Se guardan con estado "auto" en lugar de
// "manual", para saber qué no ha revisado todavía una persona.

const { TRANSLATION_LANGS } = require("./config");
const { getPath } = require("./objectPath");
const {
  normalizeFieldValue,
  isEmptyFieldValue,
  areFieldValuesEqual,
} = require("./fieldValues");
const { hashSourceValue } = require("./sourceHash");
const { FIELD_TYPES, getTranslatableFields } = require("./translatableFields");
const {
  TRANSLATION_STATUS,
  buildTranslationPath,
  buildTranslationEntry,
} = require("./translationEntry");

class TranslationInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "TranslationInputError";
    this.statusCode = 400;
  }
}

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Los formularios multipart (blog, oficinas, home) envían los objetos como
// texto JSON; el resto los envía ya como objeto.
const parseJsonInput = (raw, label) => {
  if (raw === undefined || raw === null || raw === "") return undefined;

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new TranslationInputError(`El campo "${label}" no es un JSON válido`);
    }
  }

  if (!isPlainObject(parsed)) {
    throw new TranslationInputError(`El campo "${label}" debe ser un objeto`);
  }

  return parsed;
};

const parseTranslationsInput = (raw) => parseJsonInput(raw, "translations");

const parseConfirmedInput = (raw) =>
  parseJsonInput(raw, "translationsConfirmed");

const parseAutoInput = (raw) => parseJsonInput(raw, "translationsAuto");

// Un valor con un tipo inesperado se ignora en lugar de tratarse como vacío:
// una petición mal formada nunca debe borrar traducciones ya guardadas.
const hasExpectedShape = (field, raw) => {
  if (raw === null) return true;

  return field.type === FIELD_TYPES.TEXT
    ? typeof raw === "string"
    : Array.isArray(raw);
};

// Comprueba si `path` está en la lista de un idioma: { en: ["title"] }
const isListed = (byLang, lang, path) =>
  Array.isArray(byLang?.[lang]) && byLang[lang].includes(path);

const isConfirmed = isListed;

const planFieldWrite = ({
  field,
  lang,
  source,
  stored,
  incoming,
  confirmed,
  auto,
  now,
}) => {
  const mongoPath = buildTranslationPath(lang, field.path);
  const storedEntry = getPath(stored, `${lang}.${field.path}`);
  const hasStoredEntry = Boolean(storedEntry && typeof storedEntry === "object");
  const sourceHash = hashSourceValue(field, getPath(source, field.path));
  const rawIncoming = getPath(incoming?.[lang], field.path);

  if (rawIncoming !== undefined && hasExpectedShape(field, rawIncoming)) {
    const value = normalizeFieldValue(field, rawIncoming);

    if (isEmptyFieldValue(field, value)) {
      return hasStoredEntry ? { path: mongoPath, entry: null } : null;
    }

    const isUnchanged =
      hasStoredEntry &&
      areFieldValuesEqual(value, normalizeFieldValue(field, storedEntry.value));

    if (!isUnchanged) {
      return {
        path: mongoPath,
        entry: buildTranslationEntry({
          value,
          status: isListed(auto, lang, field.path)
            ? TRANSLATION_STATUS.AUTO
            : TRANSLATION_STATUS.MANUAL,
          sourceHash,
          updatedAt: now,
        }),
      };
    }
  }

  const needsConfirmation =
    hasStoredEntry &&
    storedEntry.sourceHash !== sourceHash &&
    isConfirmed(confirmed, lang, field.path);

  if (needsConfirmation) {
    return {
      path: mongoPath,
      entry: buildTranslationEntry({
        value: normalizeFieldValue(field, storedEntry.value),
        status: TRANSLATION_STATUS.MANUAL,
        sourceHash,
        updatedAt: now,
      }),
    };
  }

  return null;
};

// `source` es la entidad con los textos en español tal y como quedan tras el
// guardado; `stored` es el bloque `translations` que hay ahora mismo en BD.
const planTranslationWrites = (
  entity,
  { source, stored, incoming, confirmed, auto, now = new Date() },
) => {
  if (!isPlainObject(incoming) && !isPlainObject(confirmed)) return [];

  const fields = getTranslatableFields(entity);

  return TRANSLATION_LANGS.flatMap((lang) =>
    fields
      .map((field) =>
        planFieldWrite({
          field,
          lang,
          source,
          stored,
          incoming,
          confirmed,
          auto,
          now,
        }),
      )
      .filter(Boolean),
  );
};

// Operadores de MongoDB para aplicar el plan con `updateOne` y similares.
// Se usan rutas con puntos para tocar solo los campos afectados.
const toMongoUpdate = (writes) =>
  writes.reduce((update, { path, entry }) => {
    const operator = entry === null ? "$unset" : "$set";
    update[operator] = { ...update[operator], [path]: entry === null ? "" : entry };
    return update;
  }, {});

// Aplica el plan sobre un documento de Mongoose que se va a guardar con save().
// `set` marca como modificada solo la ruta de cada traducción, de modo que el
// guardado no reescribe el resto del bloque `translations`.
const applyWritesToDocument = (doc, writes) => {
  writes.forEach(({ path, entry }) => {
    doc.set(path, entry === null ? undefined : entry);
  });
};

module.exports = {
  TranslationInputError,
  parseTranslationsInput,
  parseConfirmedInput,
  parseAutoInput,
  planTranslationWrites,
  toMongoUpdate,
  applyWritesToDocument,
};
