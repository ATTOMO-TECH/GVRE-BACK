const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ENTITIES,
  TranslationInputError,
  parseTranslationsInput,
  parseConfirmedInput,
  planTranslationWrites,
  toMongoUpdate,
} = require("../../src/i18n");
const { hashSourceValue } = require("../../src/i18n/sourceHash");
const { findTranslatableField } = require("../../src/i18n/translatableFields");

const NOW = new Date("2026-10-05T10:00:00.000Z");
const titleField = findTranslatableField(ENTITIES.AD, "title");
const hashOfTitle = (title) => hashSourceValue(titleField, title);

const source = {
  title: "Piso en Recoletos",
  description: { web: "Texto web" },
  surfacesBox: [{ surfaceFloor: "Baja", surfaceUse: "Local" }],
};

const plan = (overrides) =>
  planTranslationWrites(ENTITIES.AD, { source, now: NOW, ...overrides });

test("sin translations ni confirmaciones no se planifica nada", () => {
  assert.deepEqual(plan({ stored: { en: { title: { value: "Flat" } } } }), []);
  assert.deepEqual(plan({ incoming: "no-es-un-objeto" }), []);
});

test("un texto nuevo se guarda como traducción manual con la huella del español", () => {
  const writes = plan({ incoming: { en: { title: "  Flat in Recoletos  " } } });

  assert.deepEqual(writes, [
    {
      path: "translations.en.title",
      entry: {
        value: "Flat in Recoletos",
        status: "manual",
        sourceHash: hashOfTitle(source.title),
        updatedAt: NOW,
      },
    },
  ]);
});

test("campos anidados y varios idiomas a la vez", () => {
  const writes = plan({
    incoming: {
      en: { description: { web: "Web text" } },
      de: { title: "Wohnung in Recoletos" },
    },
  });

  assert.deepEqual(
    writes.map((write) => write.path),
    ["translations.en.description.web", "translations.de.title"],
  );
});

test("un idioma no configurado se ignora", () => {
  assert.deepEqual(plan({ incoming: { zz: { title: "???" } } }), []);
});

test("un texto igual al guardado no toca nada: conserva estado y huella", () => {
  const stored = {
    en: { title: { value: "Flat in Recoletos", status: "auto", sourceHash: "x" } },
  };
  assert.deepEqual(plan({ stored, incoming: { en: { title: "Flat in Recoletos" } } }), []);
});

test("cambiar un texto automático lo convierte en manual", () => {
  const stored = {
    en: { title: { value: "Flat in Recoletos", status: "auto", sourceHash: "x" } },
  };
  const [write] = plan({ stored, incoming: { en: { title: "Apartment in Recoletos" } } });

  assert.equal(write.entry.status, "manual");
  assert.equal(write.entry.value, "Apartment in Recoletos");
});

test("un texto vacío borra la traducción guardada", () => {
  const stored = { en: { title: { value: "Flat", status: "manual" } } };

  for (const empty of ["", "   ", null]) {
    assert.deepEqual(plan({ stored, incoming: { en: { title: empty } } }), [
      { path: "translations.en.title", entry: null },
    ]);
  }
});

test("un texto vacío sin traducción guardada no genera escritura", () => {
  assert.deepEqual(plan({ incoming: { en: { title: "" } } }), []);
});

test("un tipo inesperado se ignora y nunca borra lo guardado", () => {
  const stored = { en: { title: { value: "Flat", status: "manual" } } };

  for (const invalid of [123, {}, ["x"], true]) {
    assert.deepEqual(plan({ stored, incoming: { en: { title: invalid } } }), []);
  }
  assert.deepEqual(plan({ stored, incoming: { en: { surfacesBox: "texto" } } }), []);
});

test("las filas guardan solo los campos traducibles", () => {
  const [write] = plan({
    incoming: {
      en: {
        surfacesBox: [
          { surfaceFloor: " Ground ", surfaceUse: "Retail", metersPrice: "999", _id: "x" },
        ],
      },
    },
  });

  assert.equal(write.path, "translations.en.surfacesBox");
  assert.deepEqual(write.entry.value, [
    { surfaceFloor: "Ground", surfaceUse: "Retail", surfaceDisponibility: "" },
  ]);
});

test("filas con todas las celdas vacías equivalen a borrar", () => {
  const stored = {
    en: { surfacesBox: { value: [{ surfaceFloor: "Ground" }], status: "manual" } },
  };
  assert.deepEqual(
    plan({ stored, incoming: { en: { surfacesBox: [{ surfaceFloor: "" }] } } }),
    [{ path: "translations.en.surfacesBox", entry: null }],
  );
  assert.deepEqual(plan({ stored, incoming: { en: { surfacesBox: [] } } }), [
    { path: "translations.en.surfacesBox", entry: null },
  ]);
});

test("confirmar una traducción desactualizada renueva su huella sin cambiar el texto", () => {
  const stored = {
    en: { title: { value: "Flat", status: "auto", sourceHash: "huella-antigua" } },
  };
  const [write] = plan({ stored, confirmed: { en: ["title"] } });

  assert.deepEqual(write, {
    path: "translations.en.title",
    entry: {
      value: "Flat",
      status: "manual",
      sourceHash: hashOfTitle(source.title),
      updatedAt: NOW,
    },
  });
});

test("confirmar algo que ya está al día o que no existe no hace nada", () => {
  const upToDate = {
    en: { title: { value: "Flat", status: "auto", sourceHash: hashOfTitle(source.title) } },
  };
  assert.deepEqual(plan({ stored: upToDate, confirmed: { en: ["title"] } }), []);
  assert.deepEqual(plan({ stored: {}, confirmed: { en: ["title"] } }), []);
});

test("la huella cambia cuando cambia el español y no por espacios", () => {
  assert.notEqual(hashOfTitle("Piso"), hashOfTitle("Ático"));
  assert.equal(hashOfTitle("  Piso "), hashOfTitle("Piso"));
  assert.equal(hashOfTitle(undefined), hashOfTitle(""));
});

test("toMongoUpdate separa lo que se guarda de lo que se borra", () => {
  const entry = { value: "Flat" };
  assert.deepEqual(
    toMongoUpdate([
      { path: "translations.en.title", entry },
      { path: "translations.fr.title", entry: null },
    ]),
    {
      $set: { "translations.en.title": entry },
      $unset: { "translations.fr.title": "" },
    },
  );
  assert.deepEqual(toMongoUpdate([]), {});
});

test("parseTranslationsInput acepta objeto o JSON y rechaza lo demás", () => {
  assert.equal(parseTranslationsInput(undefined), undefined);
  assert.equal(parseTranslationsInput(""), undefined);
  assert.deepEqual(parseTranslationsInput({ en: {} }), { en: {} });
  assert.deepEqual(parseTranslationsInput('{"en":{"title":"Flat"}}'), {
    en: { title: "Flat" },
  });
  assert.throws(() => parseTranslationsInput("{mal json"), TranslationInputError);
  assert.throws(() => parseTranslationsInput("[1,2]"), TranslationInputError);
  assert.throws(() => parseConfirmedInput('"texto"'), TranslationInputError);
  assert.equal(new TranslationInputError("x").statusCode, 400);
});
