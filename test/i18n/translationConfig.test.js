const test = require("node:test");
const assert = require("node:assert/strict");
const { getTranslationConfig } = require("../../src/controllers/translation.controller");

test("la configuración expone idiomas y campos traducibles por entidad", () => {
  let payload;
  const res = { status: () => res, json: (body) => (payload = body) };
  getTranslationConfig({}, res);

  assert.equal(payload.defaultLang, "es");
  assert.deepEqual(payload.languages, [
    { code: "en", name: "English" },
    { code: "fr", name: "Français" },
    { code: "de", name: "Deutsch" },
  ]);
  assert.deepEqual(Object.keys(payload.entities), ["ad", "blog", "zone", "office", "webHome"]);
  assert.deepEqual(
    payload.entities.ad.map((field) => field.path),
    ["title", "description.web", "description.emailPDF", "description.distribution", "floor", "disponibility", "surfacesBox"],
  );
  assert.deepEqual(payload.entities.ad.at(-1), {
    path: "surfacesBox",
    type: "rowList",
    rowFields: ["surfaceFloor", "surfaceUse", "surfaceDisponibility"],
  });
  assert.equal(payload.autoTranslate.available, false);
});
