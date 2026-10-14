// Registro de los campos traducibles de cada entidad. Es la única fuente de
// verdad: de aquí salen el esquema de Mongoose, lo que se devuelve a la web en
// cada idioma y lo que se acepta al guardar desde el CRM.
//
// Tipos de campo:
//   TEXT       cadena simple o HTML.
//   TEXT_LIST  lista de cadenas; la traducción va alineada por posición.
//   ROW_LIST   lista de objetos de los que solo se traducen `rowFields`; la
//              traducción también va alineada por posición.

const FIELD_TYPES = Object.freeze({
  TEXT: "text",
  TEXT_LIST: "textList",
  ROW_LIST: "rowList",
});

const text = (path) => ({ path, type: FIELD_TYPES.TEXT });
const textList = (path) => ({ path, type: FIELD_TYPES.TEXT_LIST });
const rowList = (path, rowFields) => ({
  path,
  type: FIELD_TYPES.ROW_LIST,
  rowFields,
});

const HOME_CATEGORY_KEYS = [
  "residential",
  "patrimonial",
  "others",
  "location1",
  "location2",
  "location3",
  "location4",
];

const SERVICES_SECTION_KEYS = ["residenciales", "patrimoniales", "transversales"];

const ENTITIES = Object.freeze({
  AD: "ad",
  BLOG: "blog",
  ZONE: "zone",
  OFFICE: "office",
  WEB_HOME: "webHome",
});

const TRANSLATABLE_FIELDS = Object.freeze({
  // Campos de texto que ve el visitante, en la ficha web o en la ficha PDF.
  // `webSubtitle` no está: no se muestra en ninguna de las dos.
  [ENTITIES.AD]: [
    text("title"),
    text("description.web"),
    // Texto principal de la ficha PDF que se descarga desde la web
    text("description.emailPDF"),
    text("description.distribution"),
    text("floor"),
    text("disponibility"),
    rowList("surfacesBox", [
      "surfaceFloor",
      "surfaceUse",
      "surfaceDisponibility",
    ]),
  ],

  [ENTITIES.BLOG]: [
    text("title"),
    text("description"),
    text("content"),
    text("seoTitle"),
    text("seoDescription"),
    // Las etiquetas en español son además la clave de filtrado, así que la
    // traducción solo se usa para mostrarlas (ver `tagLabels` en la API web).
    textList("tags"),
  ],

  [ENTITIES.ZONE]: [text("zoneDescription")],

  [ENTITIES.OFFICE]: [text("name"), text("schedule")],

  // Solo los bloques que pinta la web actual. Los heredados (portada,
  // secciones y servicios antiguos) no se muestran y no llevan traducción.
  [ENTITIES.WEB_HOME]: [
    text("videoSection.title"),
    textList("videoSection.subtitle"),
    ...HOME_CATEGORY_KEYS.flatMap((key) => [
      text(`categoriesSection.${key}.title`),
      text(`categoriesSection.${key}.subtitle`),
    ]),
    text("talkWithUs.titleHome"),
    text("talkWithUs.titleContact"),
    text("talkWithUs.descriptionContact"),
    text("talkWithUs.contactButton"),
    ...SERVICES_SECTION_KEYS.flatMap((key) => [
      text(`services.${key}.title`),
      text(`services.${key}.subtitle`),
      rowList(`services.${key}.cards`, ["text"]),
    ]),
  ],
});

const getTranslatableFields = (entity) => {
  const fields = TRANSLATABLE_FIELDS[entity];
  if (!fields) throw new Error(`Entidad sin campos traducibles: ${entity}`);
  return fields;
};

const findTranslatableField = (entity, path) =>
  getTranslatableFields(entity).find((field) => field.path === path) || null;

module.exports = {
  ENTITIES,
  FIELD_TYPES,
  HOME_CATEGORY_KEYS,
  SERVICES_SECTION_KEYS,
  TRANSLATABLE_FIELDS,
  getTranslatableFields,
  findTranslatableField,
};
