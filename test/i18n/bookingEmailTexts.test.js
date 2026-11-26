const test = require("node:test");
const assert = require("node:assert/strict");
const { getBookingEmailTexts, BOOKING_EMAIL_TEXTS } = require("../../src/utils/bookingEmailTexts");

test("el correo de cita sale en el idioma de la web y en español si no hay idioma", () => {
  assert.equal(getBookingEmailTexts("en").subject, "Your viewing request with GVRE");
  assert.equal(getBookingEmailTexts("de").title, "Wir haben Ihre Anfrage erhalten");
  assert.equal(getBookingEmailTexts(undefined).subject, "Tu solicitud de cita con GVRE");
  assert.equal(getBookingEmailTexts("it").subject, "Tu solicitud de cita con GVRE");
});

test("los cuatro idiomas tienen los mismos textos", () => {
  const keys = Object.keys(BOOKING_EMAIL_TEXTS.es).sort();
  for (const lang of ["en", "fr", "de"]) {
    assert.deepEqual(Object.keys(BOOKING_EMAIL_TEXTS[lang]).sort(), keys);
    assert.match(BOOKING_EMAIL_TEXTS[lang].received("A1"), /A1/);
    assert.match(BOOKING_EMAIL_TEXTS[lang].next("Ana"), /Ana/);
  }
});
