// Comprueba el encaje del bloque `translations` en los modelos reales.
// No necesita base de datos: solo usa el casting y la validación de Mongoose.

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Ad = require("../../src/models/ad.model");
const Blog = require("../../src/models/blog.model");
const Zone = require("../../src/models/zone.model");
const Office = require("../../src/models/office.model");
const WebHome = require("../../src/models/webHome.model");
const { ENTITIES, planTranslationWrites, toMongoUpdate, applyWritesToDocument } = require("../../src/i18n");

const NOW = new Date("2026-10-05T10:00:00.000Z");

const castUpdate = (Model, update) => {
  const query = Model.updateOne({ _id: new mongoose.Types.ObjectId() }, update);
  return query._castUpdate(query.getUpdate());
};

const buildAd = (extra = {}) =>
  new Ad({
    adReference: "REF-1",
    title: "Piso en Recoletos",
    adDirection: { address: { street: "Calle", directionNumber: "1" } },
    adType: ["Venta"],
    adBuildingType: ["Piso"],
    department: "Residencial",
    ...extra,
  });

test("un documento sin traducciones no gana ningún campo nuevo", () => {
  const ad = buildAd();

  assert.equal(ad.validateSync(), undefined);
  assert.equal("translations" in ad.toObject(), false);
  assert.equal("translations" in JSON.parse(JSON.stringify(ad)), false);

  for (const doc of [new Zone({ name: "Recoletos" }), new WebHome({}), new Office({}), new Blog({})]) {
    assert.equal("translations" in doc.toObject(), false);
  }
});

test("las traducciones se guardan con su forma y los idiomas no configurados se descartan", () => {
  const ad = buildAd({
    translations: {
      en: {
        title: { value: "Flat in Recoletos", sourceHash: "abc", updatedAt: NOW },
        description: { web: { value: "Web text", status: "auto" } },
        surfacesBox: { value: [{ surfaceFloor: "Ground", metersPrice: "no-debe-guardarse" }] },
        campoInventado: { value: "x" },
      },
      zz: { title: { value: "???" } },
    },
  });

  assert.equal(ad.validateSync(), undefined);
  const { translations } = ad.toObject();

  assert.deepEqual(Object.keys(translations), ["en"]);
  assert.deepEqual(translations.en.title, {
    value: "Flat in Recoletos",
    status: "manual",
    sourceHash: "abc",
    updatedAt: NOW,
  });
  assert.equal(translations.en.description.web.status, "auto");
  assert.deepEqual(translations.en.surfacesBox.value, [{ surfaceFloor: "Ground" }]);
  assert.equal("campoInventado" in translations.en, false);
  // sin ids ni campos vacíos de relleno en los subdocumentos
  assert.equal("_id" in translations.en.title, false);
  assert.equal("floor" in translations.en, false);
});

test("un estado desconocido no pasa la validación", () => {
  const ad = buildAd({ translations: { en: { title: { value: "Flat", status: "inventado" } } } });
  assert.ok(ad.validateSync().errors["translations.en.title.status"]);
});

test("el plan de escritura se aplica como $set / $unset con rutas de puntos", () => {
  const writes = planTranslationWrites(ENTITIES.AD, {
    source: { title: "Piso en Recoletos", description: { web: "Texto" } },
    stored: { fr: { title: { value: "Appartement", status: "manual" } } },
    incoming: {
      en: { title: "Flat in Recoletos", description: { web: "Web text" } },
      fr: { title: "" },
    },
    now: NOW,
  });

  const cast = castUpdate(Ad, { $set: { title: "Piso en Recoletos" }, ...mergeSet(writes) });

  assert.equal(cast.$set.title, "Piso en Recoletos");
  assert.equal(cast.$set["translations.en.title"].value, "Flat in Recoletos");
  assert.equal(cast.$set["translations.en.title"].status, "manual");
  assert.equal(cast.$set["translations.en.description.web"].value, "Web text");
  assert.deepEqual(Object.keys(cast.$unset), ["translations.fr.title"]);
});

// Igual que hace adUpdate: une el $set de la entidad con el de las traducciones
function mergeSet(writes) {
  const { $set = {}, $unset } = toMongoUpdate(writes);
  return { $set: { title: "Piso en Recoletos", ...$set }, ...($unset && { $unset }) };
}

test("claves sueltas y operadores conviven en una misma actualización (blog, oficinas)", () => {
  const writes = planTranslationWrites(ENTITIES.BLOG, {
    source: { title: "Mercado", tags: ["Inversión", "Madrid"] },
    stored: { de: { title: { value: "Markt", status: "manual" } } },
    incoming: { en: { title: "Market", tags: ["Investment", "Madrid"] }, de: { title: null } },
    now: NOW,
  });
  const { $set, $unset } = toMongoUpdate(writes);

  const cast = castUpdate(Blog, { title: "Mercado", ...$set, $unset });

  assert.equal(cast.$set.title, "Mercado");
  assert.deepEqual([...cast.$set["translations.en.tags"].value], ["Investment", "Madrid"]);
  assert.deepEqual(Object.keys(cast.$unset), ["translations.de.title"]);
});

test("el plan también se aplica sobre un documento que se guarda con save()", () => {
  // Documento tal y como llega de la base de datos (sin cambios pendientes)
  const home = WebHome.hydrate(
    new WebHome({
      videoSection: { title: "Vídeos", subtitle: ["Uno", "Dos"] },
      services: { residenciales: { title: "Residencial", cards: [{ text: "A" }, { text: "B" }] } },
      translations: { en: { talkWithUs: { titleHome: { value: "Talk to us" } } } },
    }).toObject(),
  );

  const writes = planTranslationWrites(ENTITIES.WEB_HOME, {
    source: home.toObject(),
    stored: home.toObject().translations,
    incoming: {
      en: {
        videoSection: { title: "Videos", subtitle: ["One", "Two"] },
        services: { residenciales: { cards: [{ text: "A-en" }, { text: "B-en" }] } },
        talkWithUs: { titleHome: "" },
      },
    },
    now: NOW,
  });
  applyWritesToDocument(home, writes);

  assert.equal(home.validateSync(), undefined);
  const { en } = home.toObject().translations;

  assert.equal(en.videoSection.title.value, "Videos");
  assert.deepEqual(en.videoSection.subtitle.value, ["One", "Two"]);
  assert.deepEqual(en.services.residenciales.cards.value, [{ text: "A-en" }, { text: "B-en" }]);
  assert.equal(en.talkWithUs, undefined);
  // El guardado toca rutas concretas dentro del idioma, nunca el bloque
  // `translations` entero ni un idioma completo: así no reescribe lo que no
  // ha cambiado.
  const modified = home.directModifiedPaths();
  assert.ok(modified.includes("translations.en.talkWithUs.titleHome"));
  assert.ok(modified.every((path) => path.startsWith("translations.en.")));
});
