const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveRequestLang } = require("../../src/middlewares/lang.middleware");

const run = (req) => {
  let nextCalls = 0;
  resolveRequestLang(req, {}, () => nextCalls++);
  assert.equal(nextCalls, 1);
  return req.lang;
};

test("sin parámetro req.lang queda sin definir (modo CRM)", () => {
  assert.equal(run({ query: {}, body: {} }), undefined);
  assert.equal(run({ query: { lang: "" } }), undefined);
  assert.equal(run({}), undefined);
});

test("acepta el idioma por query o por cuerpo, sin distinguir mayúsculas", () => {
  assert.equal(run({ query: { lang: "en" } }), "en");
  assert.equal(run({ query: {}, body: { lang: " DE " } }), "de");
  assert.equal(run({ query: { lang: "es" } }), "es");
});

test("la query manda sobre el cuerpo", () => {
  assert.equal(run({ query: { lang: "fr" }, body: { lang: "de" } }), "fr");
});

test("un idioma no soportado o mal formado equivale a español", () => {
  assert.equal(run({ query: { lang: "it" } }), "es");
  assert.equal(run({ query: { lang: "../etc" } }), "es");
  assert.equal(run({ query: { lang: ["en", "fr"] } }), undefined);
});
