const test = require("node:test");
const assert = require("node:assert/strict");
const { PDF_LABELS, getPdfLabels } = require("../../src/services/pdfLabels");

const keysOf = (labels) => ({
  texts: Object.keys(labels).sort(),
  qualities: Object.keys(labels.qualities).sort(),
});

test("las fichas PDF tienen los mismos textos en todos los idiomas", () => {
  const spanish = keysOf(PDF_LABELS.es);
  for (const lang of ["en", "fr", "de"]) {
    assert.deepEqual(keysOf(PDF_LABELS[lang]), spanish, lang);
    Object.entries(PDF_LABELS[lang]).forEach(([key, value]) => {
      if (key !== "qualities") assert.ok(String(value).trim(), `${lang}.${key} vacío`);
    });
  }
});

test("idioma desconocido o sin idioma: español", () => {
  assert.equal(getPdfLabels(undefined).sale, "VENTA");
  assert.equal(getPdfLabels("it").sale, "VENTA");
  assert.equal(getPdfLabels("de").sale, "KAUF");
});
