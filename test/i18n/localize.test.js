const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ENTITIES,
  getTranslatedLangs,
  getLocalizedValue,
  localizeDocument,
  withTranslationStatus,
} = require("../../src/i18n");
const { hashSourceValue } = require("../../src/i18n/sourceHash");
const { findTranslatableField } = require("../../src/i18n/translatableFields");

const entry = (value, extra = {}) => ({ value, status: "manual", ...extra });

const buildAd = () => ({
  _id: "ad1",
  title: "Piso en Recoletos",
  disponibility: "",
  floor: "Tercera",
  description: { web: "Texto web", distribution: "Tres dormitorios" },
  surfacesBox: [
    { _id: "r1", surfaceFloor: "Baja", surfaceUse: "Local", metersAvailables: "120" },
    { _id: "r2", surfaceFloor: "Primera", surfaceUse: "Oficina", metersAvailables: "80" },
  ],
  translations: {
    en: {
      title: entry("Flat in Recoletos"),
      disponibility: entry("Orphan availability"),
      description: { web: entry("Web text") },
      surfacesBox: entry([
        { surfaceFloor: "Ground", surfaceUse: "Retail unit" },
        { surfaceFloor: "First", surfaceUse: "" },
      ]),
    },
  },
});

test("sin idioma o en español se devuelve el texto de origen", () => {
  const ad = buildAd();
  assert.equal(getLocalizedValue(ENTITIES.AD, ad, "title", "es"), "Piso en Recoletos");
  assert.equal(getLocalizedValue(ENTITIES.AD, ad, "title", undefined), "Piso en Recoletos");
  assert.equal(getLocalizedValue(ENTITIES.AD, ad, "title", "zz"), "Piso en Recoletos");
});

test("con traducción se devuelve la traducción", () => {
  const ad = buildAd();
  assert.equal(getLocalizedValue(ENTITIES.AD, ad, "title", "en"), "Flat in Recoletos");
  assert.equal(getLocalizedValue(ENTITIES.AD, ad, "description.web", "en"), "Web text");
});

test("sin traducción en ese idioma o en ese campo se devuelve el español", () => {
  const ad = buildAd();
  assert.equal(getLocalizedValue(ENTITIES.AD, ad, "title", "fr"), "Piso en Recoletos");
  assert.equal(
    getLocalizedValue(ENTITIES.AD, ad, "description.distribution", "en"),
    "Tres dormitorios",
  );
});

test("si el español está vacío no se muestra una traducción huérfana", () => {
  assert.equal(getLocalizedValue(ENTITIES.AD, buildAd(), "disponibility", "en"), "");
});

test("las filas se traducen celda a celda conservando el resto de datos", () => {
  const rows = getLocalizedValue(ENTITIES.AD, buildAd(), "surfacesBox", "en");
  assert.deepEqual(rows, [
    { _id: "r1", surfaceFloor: "Ground", surfaceUse: "Retail unit", surfaceDisponibility: undefined, metersAvailables: "120" },
    // la celda sin traducir cae al español
    { _id: "r2", surfaceFloor: "First", surfaceUse: "Oficina", surfaceDisponibility: undefined, metersAvailables: "80" },
  ]);
});

test("una lista traducida que ya no encaja con la española se ignora", () => {
  const ad = buildAd();
  ad.surfacesBox.push({ _id: "r3", surfaceFloor: "Segunda", surfaceUse: "Oficina" });
  assert.deepEqual(getLocalizedValue(ENTITIES.AD, ad, "surfacesBox", "en"), ad.surfacesBox);
});

test("pedir un campo no traducible es un error de programación", () => {
  assert.throws(() => getLocalizedValue(ENTITIES.AD, buildAd(), "adReference", "en"));
  // el subtítulo web no se muestra en la web pública y no se traduce
  assert.throws(() => getLocalizedValue(ENTITIES.AD, buildAd(), "webSubtitle", "en"));
});

test("localizeDocument traduce todos los campos, quita translations y no muta", () => {
  const ad = buildAd();
  const snapshot = JSON.parse(JSON.stringify(ad));
  const localized = localizeDocument(ENTITIES.AD, ad, "en");

  assert.equal(localized.title, "Flat in Recoletos");
  assert.equal(localized.description.web, "Web text");
  assert.equal(localized.description.distribution, "Tres dormitorios");
  assert.equal(localized.floor, "Tercera");
  assert.equal(localized.surfacesBox[0].surfaceUse, "Retail unit");
  assert.equal("translations" in localized, false);
  assert.deepEqual(JSON.parse(JSON.stringify(ad)), snapshot);
});

test("localizeDocument en español solo quita translations", () => {
  const ad = buildAd();
  const { translations, ...expected } = ad;
  assert.deepEqual(localizeDocument(ENTITIES.AD, ad, "es"), expected);
});

test("localizeDocument no inventa campos que el documento no tiene", () => {
  const localized = localizeDocument(ENTITIES.WEB_HOME, { _id: "h1" }, "en");
  assert.deepEqual(localized, { _id: "h1" });
});

test("listas de texto: traducción alineada con reserva por posición", () => {
  const home = {
    videoSection: { title: "Vídeos", subtitle: ["Uno", "Dos"] },
    translations: {
      en: { videoSection: { subtitle: entry(["One", ""]) } },
    },
  };
  const localized = localizeDocument(ENTITIES.WEB_HOME, home, "en");
  assert.deepEqual(localized.videoSection, { title: "Vídeos", subtitle: ["One", "Dos"] });
});

test("withTranslationStatus marca como desactualizado lo que ya no coincide con el español", () => {
  const ad = buildAd();
  const titleField = findTranslatableField(ENTITIES.AD, "title");
  ad.translations.en.title.sourceHash = hashSourceValue(titleField, ad.title);
  ad.translations.en.description.web.sourceHash = "huella-antigua";

  const annotated = withTranslationStatus(ENTITIES.AD, ad);

  assert.equal(annotated.translations.en.title.outdated, false);
  assert.equal(annotated.translations.en.description.web.outdated, true);
  assert.equal(annotated.translations.fr, undefined);
  // no muta el original
  assert.equal("outdated" in ad.translations.en.title, false);
});

test("withTranslationStatus deja intactos los documentos sin traducciones", () => {
  const doc = { _id: "z1", zoneDescription: "Texto" };
  assert.equal(withTranslationStatus(ENTITIES.ZONE, doc), doc);
});

test("getTranslatedLangs: un idioma cuenta cuando todo el contenido principal está traducido", () => {
  const ad = buildAd();
  ad.translations.fr = { title: entry("Appartement à Recoletos") };

  // inglés tiene título y descripción; francés solo el título
  assert.deepEqual(getTranslatedLangs(ENTITIES.AD, ad, ["title", "description.web"]), ["en"]);
  assert.deepEqual(getTranslatedLangs(ENTITIES.AD, ad, ["title"]), ["en", "fr"]);
});

test("getTranslatedLangs: los campos sin texto en español no se exigen", () => {
  const ad = buildAd();
  ad.description.web = "";
  ad.translations.fr = { title: entry("Appartement à Recoletos") };

  assert.deepEqual(getTranslatedLangs(ENTITIES.AD, ad, ["title", "description.web"]), ["en", "fr"]);
});

test("getTranslatedLangs: sin traducciones o sin contenido no hay idiomas", () => {
  assert.deepEqual(getTranslatedLangs(ENTITIES.AD, { title: "Piso" }, ["title"]), []);
  assert.deepEqual(getTranslatedLangs(ENTITIES.AD, { title: "" }, ["title"]), []);
  // una traducción en blanco no cuenta
  assert.deepEqual(
    getTranslatedLangs(ENTITIES.AD, { title: "Piso", translations: { en: { title: entry("  ") } } }, ["title"]),
    [],
  );
});
