const test = require("node:test");
const assert = require("node:assert/strict");
const {
  planTranslationWritesWithAuto,
  ENTITIES,
  TRANSLATION_LANGS,
  TRANSLATION_STATUS,
} = require("../../src/i18n");
const { hashSourceValue } = require("../../src/i18n/sourceHash");
const { findTranslatableField } = require("../../src/i18n/translatableFields");

const fakeTranslator = () => {
  const calls = [];
  const translator = async (texts, options) => {
    calls.push({ texts, ...options });
    return texts.map((text) => `[${options.lang}] ${text}`);
  };
  return { translator, calls };
};

const hashOf = (entity, path, value) =>
  hashSourceValue(findTranslatableField(entity, path), value);

const entry = (value, status, sourceHash) => ({
  value,
  status,
  sourceHash,
  updatedAt: new Date("2026-01-01"),
});

const byPath = (writes) =>
  Object.fromEntries(writes.map(({ path, entry: e }) => [path, e]));

test("traduce a todos los idiomas lo que no tiene traducción", async () => {
  const { translator } = fakeTranslator();
  const writes = await planTranslationWritesWithAuto(ENTITIES.LISTING_FAQ, {
    source: { question: "¿Hay metro?", answer: "Sí" },
    translator,
  });

  const result = byPath(writes);
  assert.equal(writes.length, TRANSLATION_LANGS.length * 2);
  for (const lang of TRANSLATION_LANGS) {
    const q = result[`translations.${lang}.question`];
    assert.equal(q.value, `[${lang}] ¿Hay metro?`);
    assert.equal(q.status, TRANSLATION_STATUS.AUTO);
    assert.equal(q.sourceHash, hashOf(ENTITIES.LISTING_FAQ, "question", "¿Hay metro?"));
  }
});

test("no toca traducciones al día ni manuales desactualizadas", async () => {
  const { translator, calls } = fakeTranslator();
  const source = { question: "Pregunta nueva", answer: "Respuesta" };
  const stored = Object.fromEntries(
    TRANSLATION_LANGS.map((lang) => [
      lang,
      {
        // manual y desactualizada: se respeta
        question: entry("Old question", TRANSLATION_STATUS.MANUAL, "otra-huella"),
        // automática al día: no se repite
        answer: entry(
          "Answer",
          TRANSLATION_STATUS.AUTO,
          hashOf(ENTITIES.LISTING_FAQ, "answer", "Respuesta"),
        ),
      },
    ]),
  );

  const writes = await planTranslationWritesWithAuto(ENTITIES.LISTING_FAQ, {
    source,
    stored,
    translator,
  });

  assert.deepEqual(writes, []);
  assert.equal(calls.length, 0);
});

test("retraduce una automática cuando cambia el español", async () => {
  const { translator } = fakeTranslator();
  const stored = {
    en: { answer: entry("Old", TRANSLATION_STATUS.AUTO, "huella-vieja") },
  };

  const writes = await planTranslationWritesWithAuto(ENTITIES.LISTING_FAQ, {
    source: { answer: "Texto nuevo" },
    stored,
    translator,
  });

  assert.equal(byPath(writes)["translations.en.answer"].value, "[en] Texto nuevo");
});

test("lo que la persona escribe en la petición manda sobre DeepL", async () => {
  const { translator, calls } = fakeTranslator();
  const writes = await planTranslationWritesWithAuto(ENTITIES.OFFICE, {
    source: { name: "Oficina Centro", schedule: "" },
    incoming: { en: { name: "Downtown office" } },
    translator,
  });

  const result = byPath(writes);
  assert.equal(result["translations.en.name"].value, "Downtown office");
  assert.equal(result["translations.en.name"].status, TRANSLATION_STATUS.MANUAL);
  assert.equal(result["translations.fr.name"].value, "[fr] Oficina Centro");
  // Sin español no se traduce nada
  assert.equal(result["translations.en.schedule"], undefined);
  assert.ok(calls.every((call) => call.lang !== "en"));
});

test("si se borra una traducción a mano, no se rellena en ese guardado", async () => {
  const { translator } = fakeTranslator();
  const writes = await planTranslationWritesWithAuto(ENTITIES.ZONE, {
    source: { zoneDescription: "Barrio tranquilo" },
    stored: {
      en: {
        zoneDescription: entry(
          "Quiet area",
          TRANSLATION_STATUS.AUTO,
          hashOf(ENTITIES.ZONE, "zoneDescription", "Barrio tranquilo"),
        ),
      },
    },
    incoming: { en: { zoneDescription: "" } },
    translator,
  });

  const result = byPath(writes);
  assert.equal(result["translations.en.zoneDescription"], null);
});

test("valores cortos conocidos y números no pasan por DeepL", async () => {
  const { translator, calls } = fakeTranslator();
  const writes = await planTranslationWritesWithAuto(ENTITIES.AD, {
    source: {
      floor: "Planta primera",
      disponibility: "Inmediata",
      surfacesBox: [{ surfaceFloor: "4", surfaceUse: "Oficinas", surfaceDisponibility: "" }],
    },
    translator,
  });

  const result = byPath(writes);
  assert.equal(calls.length, 0);
  assert.equal(result["translations.en.disponibility"].value, "Immediate");
  assert.notEqual(result["translations.en.floor"].value, "[en] Planta primera");
  assert.deepEqual(result["translations.en.surfacesBox"].value, [
    { surfaceFloor: "4", surfaceUse: "Offices", surfaceDisponibility: "" },
  ]);
});

test("si DeepL falla, se guardan igualmente las traducciones de la petición", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const writes = await planTranslationWritesWithAuto(ENTITIES.OFFICE, {
      source: { name: "Oficina Centro" },
      incoming: { en: { name: "Downtown office" } },
      translator: async () => {
        throw new Error("cuota agotada");
      },
    });

    assert.deepEqual(Object.keys(byPath(writes)), ["translations.en.name"]);
  } finally {
    console.error = original;
  }
});

test("si DeepL tarda demasiado, no bloquea el guardado", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const writes = await planTranslationWritesWithAuto(ENTITIES.OFFICE, {
      source: { name: "Oficina Centro" },
      translator: () => new Promise(() => {}),
      timeoutMs: 20,
    });
    assert.deepEqual(writes, []);
  } finally {
    console.error = original;
  }
});

test("sin clave de DeepL o con AUTO_TRANSLATION=false no traduce", async () => {
  const saved = { key: process.env.DEEPL_API_KEY, flag: process.env.AUTO_TRANSLATION };
  try {
    process.env.DEEPL_API_KEY = "clave-de-prueba";
    process.env.AUTO_TRANSLATION = "false";
    assert.deepEqual(
      await planTranslationWritesWithAuto(ENTITIES.OFFICE, { source: { name: "Oficina" } }),
      [],
    );

    delete process.env.DEEPL_API_KEY;
    delete process.env.AUTO_TRANSLATION;
    assert.deepEqual(
      await planTranslationWritesWithAuto(ENTITIES.OFFICE, { source: { name: "Oficina" } }),
      [],
    );
  } finally {
    if (saved.key === undefined) delete process.env.DEEPL_API_KEY;
    else process.env.DEEPL_API_KEY = saved.key;
    if (saved.flag === undefined) delete process.env.AUTO_TRANSLATION;
    else process.env.AUTO_TRANSLATION = saved.flag;
  }
});
