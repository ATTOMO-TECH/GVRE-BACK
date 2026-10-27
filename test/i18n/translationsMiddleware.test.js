const test = require("node:test");
const assert = require("node:assert/strict");
const { extractTranslationsInput } = require("../../src/middlewares/translations.middleware");

const run = (body) => {
  const req = { body };
  const res = {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  let nextCalls = 0;
  extractTranslationsInput(req, res, () => nextCalls++);
  return { req, res, nextCalls };
};

test("sin traducciones en el cuerpo deja la entrada vacía y continúa", () => {
  const { req, nextCalls } = run({ title: "Piso" });

  assert.equal(nextCalls, 1);
  assert.deepEqual(req.translationsInput, { incoming: undefined, confirmed: undefined, auto: undefined });
  assert.deepEqual(req.body, { title: "Piso" });
});

test("extrae las traducciones (objeto o JSON) y las quita del cuerpo", () => {
  const { req, nextCalls } = run({
    title: "Piso",
    translations: '{"en":{"title":"Flat"}}',
    translationsConfirmed: { fr: ["title"] },
    translationsAuto: JSON.stringify({ en: ["title"] }),
  });

  assert.equal(nextCalls, 1);
  assert.deepEqual(req.translationsInput, {
    incoming: { en: { title: "Flat" } },
    confirmed: { fr: ["title"] },
    auto: { en: ["title"] },
  });
  assert.deepEqual(req.body, { title: "Piso" });
});

test("un JSON mal formado responde 400 y no continúa", () => {
  const { req, res, nextCalls } = run({ title: "Piso", translations: "{roto" });

  assert.equal(nextCalls, 0);
  assert.equal(res.statusCode, 400);
  assert.match(res.payload.message, /translations/);
  assert.equal(req.translationsInput, undefined);
});

test("no falla si la petición no trae cuerpo", () => {
  assert.equal(run(undefined).nextCalls, 1);
});
