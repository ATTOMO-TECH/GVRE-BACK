const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_LANG,
  TRANSLATION_LANGS,
  isSupportedLang,
  isTranslationLang,
  parseLangList,
} = require("../../src/i18n/config");

test("el español es el idioma de origen y no un idioma de traducción", () => {
  assert.equal(DEFAULT_LANG, "es");
  assert.equal(isTranslationLang("es"), false);
  assert.equal(isSupportedLang("es"), true);
});

test("inglés, francés y alemán son los idiomas por defecto", () => {
  assert.deepEqual([...TRANSLATION_LANGS], ["en", "fr", "de"]);
  assert.equal(isSupportedLang("de"), true);
  assert.equal(isSupportedLang("zz"), false);
  assert.equal(isSupportedLang(undefined), false);
});

test("parseLangList limpia, deduplica y descarta el español y códigos inválidos", () => {
  assert.deepEqual(parseLangList(" EN, fr ,en,es,xyz,1a "), ["en", "fr"]);
  assert.equal(parseLangList(""), null);
  assert.equal(parseLangList("es"), null);
  assert.equal(parseLangList(undefined), null);
});
