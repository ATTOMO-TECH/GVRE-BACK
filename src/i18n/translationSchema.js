// Genera, a partir del registro de campos traducibles, la definición del
// bloque `translations` que se añade a cada modelo de Mongoose:
//
//   translations: { en: {...}, fr: {...}, de: {...} }
//
// Cada idioma es un subdocumento opcional: los documentos existentes no
// cambian hasta que alguien guarda su primera traducción.

const mongoose = require("mongoose");
const { TRANSLATION_LANGS } = require("./config");
const { setPath } = require("./objectPath");
const { FIELD_TYPES, getTranslatableFields } = require("./translatableFields");
const { TRANSLATION_STATUS } = require("./translationEntry");

const { Schema } = mongoose;

const buildRowSchema = (rowFields) =>
  new Schema(
    rowFields.reduce(
      (definition, key) => ({ ...definition, [key]: { type: String } }),
      {},
    ),
    { _id: false },
  );

const buildValueDefinition = (field) => {
  switch (field.type) {
    case FIELD_TYPES.TEXT_LIST:
      return { type: [String], default: undefined };
    case FIELD_TYPES.ROW_LIST:
      return { type: [buildRowSchema(field.rowFields)], default: undefined };
    default:
      return { type: String };
  }
};

const buildEntrySchema = (field) =>
  new Schema(
    {
      value: buildValueDefinition(field),
      status: {
        type: String,
        enum: Object.values(TRANSLATION_STATUS),
        default: TRANSLATION_STATUS.MANUAL,
      },
      sourceHash: { type: String },
      updatedAt: { type: Date },
    },
    { _id: false },
  );

const buildLanguageSchema = (fields) =>
  new Schema(
    fields.reduce(
      (definition, field) =>
        setPath(definition, field.path, { type: buildEntrySchema(field) }),
      {},
    ),
    { _id: false },
  );

const buildTranslationsDefinition = (entity) => {
  const fields = getTranslatableFields(entity);

  return TRANSLATION_LANGS.reduce(
    (definition, lang) => ({
      ...definition,
      [lang]: { type: buildLanguageSchema(fields) },
    }),
    {},
  );
};

module.exports = { buildTranslationsDefinition };
