const test = require("node:test");
const assert = require("node:assert/strict");
const { translateLabel, translateLabels } = require("../../src/i18n");

test("las etiquetas se traducen al idioma pedido", () => {
  assert.equal(translateLabel("Venta y Alquiler", "en"), "Sale and Rent");
  assert.equal(translateLabel("Consultar", "fr"), "Prix sur demande");
  assert.equal(translateLabel("mes", "de"), "Monat");
});

test("en español, sin idioma o con idioma desconocido no cambian", () => {
  assert.equal(translateLabel("Venta", "es"), "Venta");
  assert.equal(translateLabel("Venta", undefined), "Venta");
  assert.equal(translateLabel("Venta", "zz"), "Venta");
});

test("lo que no está en el diccionario se devuelve tal cual", () => {
  assert.equal(translateLabel("Oficina", "en"), "Oficina");
  assert.equal(translateLabel("", "en"), "");
  assert.equal(translateLabel(null, "en"), null);
  assert.equal(translateLabel(false, "en"), false);
});

test("translateLabels traduce listas y respeta lo que no es una lista", () => {
  assert.deepEqual(translateLabels(["Oficina", "Reformado", "Venta"], "en"), [
    "Oficina",
    "Refurbished",
    "Sale",
  ]);
  assert.equal(translateLabels(undefined, "en"), undefined);
});
