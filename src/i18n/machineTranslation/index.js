// Traducción automática de los campos traducibles de una entidad.
//
// El CRM envía los textos en español de los campos que quiere traducir (con
// la misma forma que en el modelo) y recibe las traducciones con esa misma
// forma, listas para rellenar el formulario. Nada se guarda aquí: se guardan
// cuando el usuario pulsa "Guardar", como cualquier traducción.

const { FIELD_TYPES, getTranslatableFields } = require("../translatableFields");
const { getPath, setPath } = require("../objectPath");
const deepl = require("./deepl");

const HTML_PATTERN = /<[a-z][^>]*>/i;

const isText = (value) => typeof value === "string" && value.trim() !== "";

// Lista plana de los textos de un campo, con dónde va cada uno al volver:
//   TEXT      "Hola"                       → ["Hola"]
//   TEXT_LIST ["A", "B"]                   → ["A", "B"]
//   ROW_LIST  [{ surfaceUse: "Oficina" }]  → ["Oficina"] (solo `rowFields`)
const collectTexts = (field, value) => {
  if (field.type === FIELD_TYPES.TEXT) {
    return isText(value) ? [{ text: value }] : [];
  }
  if (!Array.isArray(value)) return [];

  if (field.type === FIELD_TYPES.TEXT_LIST) {
    return value.flatMap((item, index) =>
      isText(item) ? [{ text: item, index }] : [],
    );
  }

  return value.flatMap((row, index) =>
    (field.rowFields || []).flatMap((column) =>
      isText(row?.[column]) ? [{ text: row[column], index, column }] : [],
    ),
  );
};

// Valor traducido con la forma del original. Lo que no se ha traducido
// (huecos, columnas vacías) queda vacío, igual que en español.
const rebuildValue = (field, value, translated) => {
  if (field.type === FIELD_TYPES.TEXT) return translated[0]?.result ?? "";

  if (field.type === FIELD_TYPES.TEXT_LIST) {
    const out = value.map(() => "");
    translated.forEach(({ index, result }) => {
      out[index] = result;
    });
    return out;
  }

  const out = value.map(() =>
    Object.fromEntries((field.rowFields || []).map((column) => [column, ""])),
  );
  translated.forEach(({ index, column, result }) => {
    out[index][column] = result;
  });
  return out;
};

// `source`: textos en español de los campos a traducir, con la forma del
// modelo ({ title: "...", description: { web: "..." } }). Se ignora lo que no
// sea un campo traducible de la entidad.
// `translator(texts, { lang, html })` permite cambiar de proveedor (y probar).
const translateFields = async (
  entity,
  lang,
  source,
  translator = deepl.translate,
) => {
  const items = getTranslatableFields(entity).flatMap((field) => {
    const value = getPath(source, field.path);
    return collectTexts(field, value).map((item) => ({ ...item, field, value }));
  });

  // Los textos con formato (HTML) se envían aparte para conservar etiquetas
  for (const html of [false, true]) {
    const group = items.filter((item) => HTML_PATTERN.test(item.text) === html);
    if (group.length === 0) continue;

    const results = await translator(
      group.map((item) => item.text),
      { lang, html },
    );
    group.forEach((item, i) => {
      item.result = results[i] ?? "";
    });
  }

  return getTranslatableFields(entity).reduce((out, field) => {
    const translated = items.filter((item) => item.field === field);
    if (translated.length === 0) return out;
    const value = getPath(source, field.path);
    return setPath(out, field.path, rebuildValue(field, value, translated));
  }, {});
};

module.exports = {
  provider: deepl,
  isMachineTranslationEnabled: deepl.isConfigured,
  translateFields,
  MachineTranslationError: deepl.MachineTranslationError,
};
