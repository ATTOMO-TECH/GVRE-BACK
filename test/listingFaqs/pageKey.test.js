const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ListingFaqInputError,
  parsePageKey,
  parseFaqContent,
} = require("../../src/listingFaqs/pageKey");

test("barrio + operación de residencial", () => {
  assert.deepEqual(
    parsePageKey({
      department: "residencial",
      city: "madrid",
      zone: "la-moraleja",
      operation: "venta",
    }),
    { department: "residencial", city: "madrid", zone: "la-moraleja", operation: "venta" },
  );
});

test("ciudad + operación: el barrio queda a null", () => {
  assert.deepEqual(
    parsePageKey({ department: "residencial", city: "marbella", zone: "", operation: "alquiler" }),
    { department: "residencial", city: "marbella", zone: null, operation: "alquiler" },
  );
});

test("venta y alquiler a la vez: operación \"todas\"", () => {
  assert.deepEqual(
    parsePageKey({ department: "residencial", city: "madrid", zone: "la-moraleja", operation: "todas" }),
    { department: "residencial", city: "madrid", zone: "la-moraleja", operation: "todas" },
  );
  assert.deepEqual(
    parsePageKey({ department: "otros-activos-y-zonas", operation: "todas" }),
    { department: "otros-activos-y-zonas", city: null, zone: null, operation: "todas" },
  );
});

test("normaliza mayúsculas y espacios", () => {
  assert.deepEqual(
    parsePageKey({ department: " Patrimonio ", city: "MADRID", zone: "Almagro", operation: "Venta" }),
    { department: "patrimonio", city: "madrid", zone: "almagro", operation: "venta" },
  );
});

test("otros activos: sin ciudad ni barrio", () => {
  assert.deepEqual(
    parsePageKey({ department: "otros-activos-y-zonas", operation: "venta" }),
    { department: "otros-activos-y-zonas", city: null, zone: null, operation: "venta" },
  );
  assert.throws(
    () => parsePageKey({ department: "otros-activos-y-zonas", city: "madrid", operation: "venta" }),
    ListingFaqInputError,
  );
});

test("rechaza combinaciones que no existen en la web", () => {
  const invalid = [
    {},
    { department: "costa", city: "marbella", operation: "venta" },
    { department: "residencial", city: "madrid", operation: "traspaso" },
    { department: "residencial", operation: "venta" },
    { department: "patrimonio", city: "marbella", operation: "venta" },
  ];
  invalid.forEach((input) =>
    assert.throws(() => parsePageKey(input), ListingFaqInputError, JSON.stringify(input)),
  );
});

test("pregunta y respuesta obligatorias, sin espacios sobrantes", () => {
  assert.deepEqual(parseFaqContent({ question: " ¿Hola? ", answer: " Sí. " }), {
    question: "¿Hola?",
    answer: "Sí.",
  });
  assert.throws(() => parseFaqContent({ question: "¿Hola?", answer: "  " }), ListingFaqInputError);
  assert.throws(() => parseFaqContent({ question: 3, answer: "Sí" }), ListingFaqInputError);
});
