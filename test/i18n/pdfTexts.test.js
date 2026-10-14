const test = require("node:test");
const assert = require("node:assert/strict");
const { getAdPdfTexts } = require("../../src/services/pdfTexts");

const entry = (value) => ({ value, status: "manual" });

const buildAd = (overrides = {}) => ({
  title: "Oficina en Recoletos",
  floor: "Tercera",
  disponibility: "Inmediata",
  description: {
    web: "Texto para la web",
    emailPDF: "Texto para el PDF",
    distribution: "Planta diáfana",
  },
  surfacesBox: [{ surfaceFloor: "Baja", surfaceUse: "Local", metersAvailables: "100" }],
  translations: {
    en: {
      title: entry("Office in Recoletos"),
      floor: entry("Third"),
      description: {
        web: entry("Web text"),
        emailPDF: entry("PDF text"),
        distribution: entry("Open plan"),
      },
      surfacesBox: entry([{ surfaceFloor: "Ground", surfaceUse: "Retail" }]),
    },
  },
  ...overrides,
});

test("en español (o sin idioma) el PDF usa los textos de siempre", () => {
  for (const lang of [undefined, "es"]) {
    assert.deepEqual(getAdPdfTexts(buildAd(), lang), {
      title: "Oficina en Recoletos",
      pdfDescription: "Texto para el PDF",
      webDescription: "Texto para la web",
      distribution: "Planta diáfana",
      floor: "Tercera",
      disponibility: "Inmediata",
      surfacesBox: [{ surfaceFloor: "Baja", surfaceUse: "Local", metersAvailables: "100" }],
      urlPrefix: "",
    });
  }
});

test("en otro idioma usa las traducciones y el enlace a la web en ese idioma", () => {
  const texts = getAdPdfTexts(buildAd(), "en");

  assert.equal(texts.title, "Office in Recoletos");
  assert.equal(texts.pdfDescription, "PDF text");
  assert.equal(texts.distribution, "Open plan");
  assert.equal(texts.floor, "Third");
  // sin traducir → español
  assert.equal(texts.disponibility, "Inmediata");
  assert.deepEqual(texts.surfacesBox, [
    { surfaceFloor: "Ground", surfaceUse: "Retail", surfaceDisponibility: undefined, metersAvailables: "100" },
  ]);
  assert.equal(texts.urlPrefix, "/en");
});

test("un idioma sin ninguna traducción cae al español campo a campo", () => {
  const texts = getAdPdfTexts(buildAd(), "de");
  assert.equal(texts.title, "Oficina en Recoletos");
  assert.equal(texts.pdfDescription, "Texto para el PDF");
  assert.equal(texts.urlPrefix, "/de");
});

test("si la descripción del PDF es la misma que la web, vale la traducción de la web", () => {
  const ad = buildAd({
    description: { web: "Mismo texto", emailPDF: "  Mismo   texto " },
    translations: { en: { description: { web: entry("Same text") } } },
  });

  assert.equal(getAdPdfTexts(ad, "en").pdfDescription, "Same text");
  // en español no se toca: sale el texto del PDF tal cual está guardado
  assert.equal(getAdPdfTexts(ad, "es").pdfDescription, "  Mismo   texto ");
});

test("si son textos distintos, no se mezcla la traducción de la web en el PDF", () => {
  const ad = buildAd({
    translations: { en: { description: { web: entry("Web text") } } },
  });
  assert.equal(getAdPdfTexts(ad, "en").pdfDescription, "Texto para el PDF");
});

test("la traducción propia del PDF manda sobre la de la web", () => {
  const ad = buildAd({
    description: { web: "Mismo texto", emailPDF: "Mismo texto" },
    translations: { en: { description: { web: entry("Same text"), emailPDF: entry("Short PDF text") } } },
  });
  assert.equal(getAdPdfTexts(ad, "en").pdfDescription, "Short PDF text");
});

test("anuncio sin descripción de PDF: no inventa texto", () => {
  const ad = buildAd({ description: { web: "Texto para la web" }, translations: {} });
  const texts = getAdPdfTexts(ad, "en");
  assert.equal(texts.pdfDescription, undefined);
  assert.equal(texts.webDescription, "Texto para la web");
});

test("acepta documentos de Mongoose además de objetos planos", () => {
  const Ad = require("../../src/models/ad.model");
  const doc = new Ad({
    adReference: "R1",
    title: "Oficina en Recoletos",
    adDirection: { address: { street: "C", directionNumber: "1" } },
    adType: ["Venta"],
    adBuildingType: ["Oficina"],
    department: "Patrimonio",
    description: { emailPDF: "Texto para el PDF" },
    surfacesBox: [{ surfaceFloor: "Baja" }],
    translations: {
      en: {
        title: { value: "Office in Recoletos" },
        description: { emailPDF: { value: "PDF text" } },
        surfacesBox: { value: [{ surfaceFloor: "Ground" }] },
      },
    },
  });

  const texts = getAdPdfTexts(doc, "en");
  assert.equal(texts.title, "Office in Recoletos");
  assert.equal(texts.pdfDescription, "PDF text");
  assert.equal(texts.surfacesBox[0].surfaceFloor, "Ground");
});
