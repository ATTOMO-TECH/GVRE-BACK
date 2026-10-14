// Huella del texto en español de un campo. Se guarda junto a cada traducción
// en el momento de traducir; si más adelante el español cambia, la huella deja
// de coincidir y la traducción se considera desactualizada.

const crypto = require("crypto");
const { normalizeFieldValue } = require("./fieldValues");

const HASH_LENGTH = 16;

const hashSourceValue = (field, sourceValue) =>
  crypto
    .createHash("sha1")
    .update(JSON.stringify(normalizeFieldValue(field, sourceValue)))
    .digest("hex")
    .slice(0, HASH_LENGTH);

module.exports = { hashSourceValue };
