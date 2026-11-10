// Etiquetas que el servidor genera en código (no las escribe nadie en el CRM).
// La clave es el texto en español, que es el que se sigue usando internamente.
//
// Solo se traducen campos que la web únicamente muestra (`priceLabel`,
// `period`, `tags`). Los que usa como clave de lógica o para construir URLs
// (`operation`, `category`, `location`, `gvOperationClose`...) se devuelven
// siempre en español.

const { isTranslationLang } = require("./config");

const LABELS = Object.freeze({
  Venta: { en: "Sale", fr: "Vente", de: "Kauf" },
  Alquiler: { en: "Rent", fr: "Location", de: "Miete" },
  "Venta y Alquiler": {
    en: "Sale and Rent",
    fr: "Vente et Location",
    de: "Kauf und Miete",
  },
  Consultar: {
    en: "Price on request",
    fr: "Prix sur demande",
    de: "Preis auf Anfrage",
  },
  mes: { en: "month", fr: "mois", de: "Monat" },
  Reformado: { en: "Refurbished", fr: "Rénové", de: "Renoviert" },
  "A reformar": {
    en: "To refurbish",
    fr: "À rénover",
    de: "Renovierungsbedürftig",
  },
  "En Rentabilidad": {
    en: "Income-generating",
    fr: "En rentabilité",
    de: "Renditeobjekt",
  },
});

// Devuelve la etiqueta en el idioma pedido. Si no hay traducción (idioma sin
// diccionario o etiqueta desconocida) se devuelve tal cual, en español.
const translateLabel = (label, lang) => {
  if (!isTranslationLang(lang) || typeof label !== "string") return label;

  return LABELS[label]?.[lang] || label;
};

const translateLabels = (labels, lang) =>
  Array.isArray(labels) ? labels.map((label) => translateLabel(label, lang)) : labels;

module.exports = { translateLabel, translateLabels };
