// Traducción automática al guardar.
//
// Cuando el CRM crea o edita una entidad traducible, además de guardar las
// traducciones que llegan en la petición se traducen con DeepL los campos que
// lo necesitan, en todos los idiomas:
//   - el campo tiene texto en español y no tiene traducción, o
//   - la traducción es automática y el español ha cambiado desde entonces.
//
// Nunca se pisa:
//   - una traducción manual (escrita o revisada por una persona), aunque esté
//     desactualizada: se sigue marcando como tal en el CRM;
//   - un campo que la persona ha tocado en esta misma petición (lo ha escrito,
//     confirmado o borrado).
//
// Si DeepL falla o tarda demasiado, el guardado sigue adelante sin estas
// traducciones: se reintentan en el siguiente guardado o con el botón del CRM.
//
// Se puede desactivar con AUTO_TRANSLATION=false.

const { TRANSLATION_LANGS } = require("../config");
const { getTranslatableFields } = require("../translatableFields");
const { getPath, setPath } = require("../objectPath");
const { normalizeFieldValue, isEmptyFieldValue } = require("../fieldValues");
const { hashSourceValue } = require("../sourceHash");
const {
  TRANSLATION_STATUS,
  buildTranslationPath,
  buildTranslationEntry,
} = require("../translationEntry");
const { planTranslationWrites } = require("../translationWrites");
const { translateFields } = require("./index");
const deepl = require("./deepl");
// Valores cortos de los anuncios ya traducidos y revisados ("Planta primera",
// "Inmediata", "Oficinas"...). Se usan antes que DeepL, que los traduce peor.
const SHORT_VALUES = require("./shortValues.json");

const TIMEOUT_MS = 30_000;
const HAS_LETTERS = /\p{L}/u;

const isAutoTranslationEnabled = () =>
  process.env.AUTO_TRANSLATION !== "false" && deepl.isConfigured();

// Envuelve al traductor: los textos sin letras ("4", "120 m²") se quedan como
// están y los valores cortos conocidos salen de la tabla; el resto va a DeepL.
const withShortValues = (translator) => async (texts, options) => {
  const results = texts.map((text) => {
    const key = text.trim();
    if (!HAS_LETTERS.test(key)) return text;
    return SHORT_VALUES[key]?.[options.lang];
  });

  const pending = results
    .map((result, index) => (result === undefined ? index : -1))
    .filter((index) => index >= 0);

  if (pending.length > 0) {
    const translated = await translator(
      pending.map((index) => texts[index]),
      options,
    );
    pending.forEach((index, i) => {
      results[index] = translated[i] ?? "";
    });
  }

  return results;
};

const needsAutoTranslation = ({ field, lang, source, stored, skipPaths }) => {
  const sourceValue = getPath(source, field.path);
  if (isEmptyFieldValue(field, normalizeFieldValue(field, sourceValue))) {
    return false;
  }
  if (skipPaths.has(buildTranslationPath(lang, field.path))) return false;

  const entry = getPath(stored, `${lang}.${field.path}`);
  const hasValue =
    entry &&
    typeof entry === "object" &&
    !isEmptyFieldValue(field, normalizeFieldValue(field, entry.value));
  if (!hasValue) return true;

  return (
    entry.status === TRANSLATION_STATUS.AUTO &&
    entry.sourceHash !== hashSourceValue(field, sourceValue)
  );
};

// Traducciones automáticas que hay que escribir, con la misma forma que las de
// `planTranslationWrites`: [{ path, entry }].
const planAutoTranslationWrites = async (
  entity,
  { source, stored, skipPaths = [], translator = deepl.translate, now = new Date() },
) => {
  const skip = new Set(skipPaths);
  const fields = getTranslatableFields(entity);

  const jobs = TRANSLATION_LANGS.map((lang) => ({
    lang,
    fields: fields.filter((field) =>
      needsAutoTranslation({ field, lang, source, stored, skipPaths: skip }),
    ),
  })).filter((job) => job.fields.length > 0);

  if (jobs.length === 0) return [];

  const translate = withShortValues(translator);

  const perLang = await Promise.all(
    jobs.map(async ({ lang, fields: langFields }) => {
      const partialSource = langFields.reduce(
        (out, field) => setPath(out, field.path, getPath(source, field.path)),
        {},
      );
      const translated = await translateFields(
        entity,
        lang,
        partialSource,
        translate,
      );

      return langFields.flatMap((field) => {
        const value = normalizeFieldValue(field, getPath(translated, field.path));
        if (isEmptyFieldValue(field, value)) return [];

        return [
          {
            path: buildTranslationPath(lang, field.path),
            entry: buildTranslationEntry({
              value,
              status: TRANSLATION_STATUS.AUTO,
              sourceHash: hashSourceValue(field, getPath(source, field.path)),
              updatedAt: now,
            }),
          },
        ];
      });
    }),
  );

  return perLang.flat();
};

const withTimeout = (promise, ms) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("la traducción automática ha tardado demasiado")),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};

// Lo que guardan los controladores: las traducciones de la petición (como
// siempre) más las automáticas de los campos que falten. No lanza errores por
// culpa del traductor.
//
// `autoSource` (opcional): español completo de la entidad tras guardar, si
// `source` puede venir incompleto.
const planTranslationWritesWithAuto = async (
  entity,
  {
    source,
    autoSource = source,
    stored,
    incoming,
    confirmed,
    auto,
    now = new Date(),
    translator,
    timeoutMs = TIMEOUT_MS,
  },
) => {
  const writes = planTranslationWrites(entity, {
    source,
    stored,
    incoming,
    confirmed,
    auto,
    now,
  });

  if (!translator && !isAutoTranslationEnabled()) return writes;

  try {
    const autoWrites = await withTimeout(
      planAutoTranslationWrites(entity, {
        source: autoSource,
        stored,
        skipPaths: writes.map((write) => write.path),
        translator: translator || deepl.translate,
        now,
      }),
      timeoutMs,
    );
    return [...writes, ...autoWrites];
  } catch (error) {
    console.error(
      `⚠️ Traducción automática no disponible (${entity}): ${error.message}`,
    );
    return writes;
  }
};

module.exports = {
  isAutoTranslationEnabled,
  planAutoTranslationWrites,
  planTranslationWritesWithAuto,
};
