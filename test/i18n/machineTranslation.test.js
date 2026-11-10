const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { translateFields } = require("../../src/i18n/machineTranslation");
const { planTranslationWrites, ENTITIES, TRANSLATION_STATUS } = require("../../src/i18n");

// Traductor falso: marca cada texto y anota cómo se ha pedido
const fakeTranslator = () => {
  const calls = [];
  const translator = async (texts, options) => {
    calls.push({ texts, ...options });
    return texts.map((text) => `[${options.lang}] ${text}`);
  };
  return { translator, calls };
};

test("traduce cada tipo de campo y devuelve la misma forma", async () => {
  const { translator, calls } = fakeTranslator();
  const result = await translateFields(
    ENTITIES.AD,
    "en",
    {
      title: "Chalet en La Moraleja",
      description: { web: "<p>Gran <b>jardín</b></p>", distribution: "" },
      surfacesBox: [
        { surfaceFloor: "Baja", surfaceUse: "Oficina", surfaceDisponibility: "" },
        { surfaceFloor: "", surfaceUse: "Local", surfaceDisponibility: "Inmediata" },
      ],
      adReference: "ER1", // no es traducible: se ignora
    },
    translator,
  );

  assert.deepEqual(result, {
    title: "[en] Chalet en La Moraleja",
    description: { web: "[en] <p>Gran <b>jardín</b></p>" },
    surfacesBox: [
      { surfaceFloor: "[en] Baja", surfaceUse: "[en] Oficina", surfaceDisponibility: "" },
      { surfaceFloor: "", surfaceUse: "[en] Local", surfaceDisponibility: "[en] Inmediata" },
    ],
  });
  // El texto con formato va en su propia petición, con HTML activado
  assert.deepEqual(calls.map((c) => c.html), [false, true]);
  assert.deepEqual(calls[1].texts, ["<p>Gran <b>jardín</b></p>"]);
});

test("sin textos no llama al traductor", async () => {
  const { translator, calls } = fakeTranslator();
  assert.deepEqual(await translateFields(ENTITIES.OFFICE, "de", { name: "" }, translator), {});
  assert.equal(calls.length, 0);
});

test("lo rellenado con DeepL se guarda como automático; lo retocado, como manual", () => {
  const writes = planTranslationWrites(ENTITIES.OFFICE, {
    source: { name: "Oficina Lagasca", schedule: "L-V 9-18" },
    stored: {},
    incoming: { en: { name: "Lagasca Office", schedule: "Mon-Fri 9-18" } },
    auto: { en: ["name"] },
  });
  const status = Object.fromEntries(writes.map((w) => [w.path, w.entry.status]));
  assert.equal(status["translations.en.name"], TRANSLATION_STATUS.AUTO);
  assert.equal(status["translations.en.schedule"], TRANSLATION_STATUS.MANUAL);
});

// Endpoint del CRM, con DeepL simulado (no se llama al servicio real)
const startApp = async () => {
  const app = express();
  app.use(express.json());
  app.use("/translations", require("../../src/routes/translation.routes"));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  return { server, url: `http://127.0.0.1:${server.address().port}` };
};

test("endpoint: sin clave de DeepL avisa y el botón queda desactivado", async () => {
  delete process.env.DEEPL_API_KEY;
  const { server, url } = await startApp();
  try {
    const config = await (await fetch(`${url}/translations/config`)).json();
    assert.deepEqual(config.autoTranslate, { available: false, provider: "DeepL" });

    const res = await fetch(`${url}/translations/machine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "ad", lang: "en", fields: { title: "Hola" } }),
    });
    assert.equal(res.status, 503);

    const bad = await fetch(`${url}/translations/machine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "nada", lang: "en", fields: {} }),
    });
    assert.equal(bad.status, 400);
  } finally {
    server.close();
  }
});

test("endpoint: con clave llama a DeepL y devuelve las traducciones", async () => {
  process.env.DEEPL_API_KEY = "clave-de-prueba:fx";
  const realFetch = global.fetch;
  const sent = [];
  const { server, url } = await startApp();
  global.fetch = async (target, options) => {
    if (!String(target).includes("deepl.com")) return realFetch(target, options);
    sent.push({ target: String(target), body: JSON.parse(options.body), auth: options.headers.Authorization });
    const { text } = JSON.parse(options.body);
    return new Response(JSON.stringify({ translations: text.map((t) => ({ text: `EN:${t}` })) }), { status: 200 });
  };
  try {
    const config = await (await realFetch(`${url}/translations/config`)).json();
    assert.equal(config.autoTranslate.available, true);

    const res = await realFetch(`${url}/translations/machine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "listingFaq", lang: "en", fields: { question: "¿Hola?", answer: "Sí." } }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual((await res.json()).translations, { question: "EN:¿Hola?", answer: "EN:Sí." });
    // Clave gratuita (:fx) → dominio api-free; de español a inglés británico
    assert.ok(sent[0].target.startsWith("https://api-free.deepl.com/v2/translate"));
    assert.equal(sent[0].body.source_lang, "ES");
    assert.equal(sent[0].body.target_lang, "EN-GB");
    assert.equal(sent[0].auth, "DeepL-Auth-Key clave-de-prueba:fx");
  } finally {
    global.fetch = realFetch;
    delete process.env.DEEPL_API_KEY;
    server.close();
  }
});

test("endpoint: un error de DeepL llega al CRM con un mensaje claro", async () => {
  process.env.DEEPL_API_KEY = "clave-de-prueba";
  const realFetch = global.fetch;
  const { server, url } = await startApp();
  global.fetch = async (target, options) =>
    String(target).includes("deepl.com")
      ? new Response("{}", { status: 456 })
      : realFetch(target, options);
  try {
    const res = await realFetch(`${url}/translations/machine`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "office", lang: "de", fields: { name: "Oficina" } }),
    });
    assert.equal(res.status, 502);
    assert.match((await res.json()).message, /cuota/);
  } finally {
    global.fetch = realFetch;
    delete process.env.DEEPL_API_KEY;
    server.close();
  }
});
