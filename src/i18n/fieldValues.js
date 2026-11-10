// Normalización de los valores de un campo traducible. Se usa igual para el
// texto en español (al calcular su huella) y para las traducciones que llegan
// del CRM, de modo que dos valores equivalentes siempre se comparan igual.

const { FIELD_TYPES } = require("./translatableFields");

// Los números se aceptan porque Mongoose los guarda como texto en los campos
// String: así el valor da la misma huella antes y después de pasar por la BD.
const toText = (value) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const isBlank = (value) => toText(value) === "";

const normalizeRow = (row, rowFields) =>
  rowFields.reduce((normalized, key) => {
    normalized[key] = toText(row?.[key]);
    return normalized;
  }, {});

const normalizeFieldValue = (field, value) => {
  switch (field.type) {
    case FIELD_TYPES.TEXT_LIST:
      return Array.isArray(value) ? value.map(toText) : [];
    case FIELD_TYPES.ROW_LIST:
      return Array.isArray(value)
        ? value.map((row) => normalizeRow(row, field.rowFields))
        : [];
    default:
      return toText(value);
  }
};

// Un valor está vacío cuando no aporta ningún texto: cadena en blanco, lista
// vacía o lista en la que todas las posiciones están en blanco.
const isEmptyFieldValue = (field, normalizedValue) => {
  switch (field.type) {
    case FIELD_TYPES.TEXT_LIST:
      return normalizedValue.every(isBlank);
    case FIELD_TYPES.ROW_LIST:
      return normalizedValue.every((row) =>
        field.rowFields.every((key) => isBlank(row[key])),
      );
    default:
      return isBlank(normalizedValue);
  }
};

const areFieldValuesEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

module.exports = {
  toText,
  isBlank,
  normalizeFieldValue,
  isEmptyFieldValue,
  areFieldValuesEqual,
};
