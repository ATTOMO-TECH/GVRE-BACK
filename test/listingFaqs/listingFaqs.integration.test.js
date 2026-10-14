// Endpoints de las FAQs de los listados sobre una base de datos en memoria:
// no toca ninguna base de datos real. Necesita `mongodb-memory-server`; si no
// está instalado, la prueba se omite.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

let MongoMemoryServer;
try {
  ({ MongoMemoryServer } = require("mongodb-memory-server"));
} catch (error) {
  MongoMemoryServer = null;
}

const SKIP = MongoMemoryServer
  ? false
  : "requiere mongodb-memory-server (npm i -D mongodb-memory-server)";

// Sin avisos a la web pública
Object.assign(process.env, {
  FRONTEND_URL: "http://127.0.0.1:9",
  ENABLE_REVALIDATION: "false",
});

// Sesión simulada: el middleware real valida un JWT contra la base de datos.
// Aquí basta con distinguir peticiones con y sin sesión.
const AUTH_MODULE = path.resolve(__dirname, "../../src/middlewares/auth.middleware.js");
require.cache[AUTH_MODULE] = {
  id: AUTH_MODULE,
  filename: AUTH_MODULE,
  loaded: true,
  exports: {
    isAuth: (req, res, next) =>
      req.headers.authorization === "Bearer test"
        ? next()
        : res.status(401).json({ message: "No autorizado" }),
  },
};

const ctx = {};

const api = async (method, url, { json, auth = true } = {}) => {
  const headers = {};
  if (json) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = "Bearer test";

  const response = await fetch(`${ctx.baseUrl}${url}`, {
    method,
    headers,
    body: json && JSON.stringify(json),
  });
  return { status: response.status, body: await response.json() };
};

const MORALEJA_VENTA = {
  department: "residencial",
  city: "madrid",
  zone: "la-moraleja",
  operation: "venta",
};
const pageQuery = (page) => `/listing-faqs?${new URLSearchParams(
  Object.entries(page).filter(([, value]) => value),
)}`;

test.before(async () => {
  if (SKIP) return;
  ctx.mongo = await MongoMemoryServer.create();
  const express = require("express");
  const mongoose = require("mongoose");
  ctx.mongoose = mongoose;
  await mongoose.connect(ctx.mongo.getUri());

  const app = express();
  app.use(express.json());
  app.use(require("../../src/middlewares/lang.middleware").resolveRequestLang);
  app.use("/listing-faqs", require("../../src/routes/listingFaq.routes"));
  await new Promise((resolve) => {
    ctx.server = app.listen(0, "127.0.0.1", resolve);
  });
  ctx.baseUrl = `http://127.0.0.1:${ctx.server.address().port}`;

  const Zone = require("../../src/models/zone.model");
  await Zone.create([
    { name: "La Moraleja", zone: "Residencial" },
    { name: "El Viso", zone: "Residencial" },
  ]);
});

test.after(async () => {
  if (SKIP) return;
  await new Promise((resolve) => ctx.server.close(resolve));
  await ctx.mongoose.disconnect();
  await ctx.mongo.stop();
});

test("crear, leer en orden, editar, reordenar y borrar", { skip: SKIP }, async () => {
  const first = await api("POST", "/listing-faqs", {
    json: { ...MORALEJA_VENTA, question: "¿Primera?", answer: "Uno." },
  });
  assert.equal(first.status, 201);
  const second = await api("POST", "/listing-faqs", {
    json: { ...MORALEJA_VENTA, question: "¿Segunda?", answer: "Dos." },
  });
  // Otra página: no se mezcla con La Moraleja en venta
  await api("POST", "/listing-faqs", {
    json: { ...MORALEJA_VENTA, operation: "alquiler", question: "¿Alquiler?", answer: "Sí." },
  });

  let page = await api("GET", pageQuery(MORALEJA_VENTA), { auth: false });
  assert.equal(page.status, 200);
  assert.deepEqual(page.body.faqs.map((f) => f.question), ["¿Primera?", "¿Segunda?"]);

  const edited = await api("PUT", `/listing-faqs/${second.body.faq._id}`, {
    json: { question: "¿Segunda editada?", answer: "Dos bis." },
  });
  assert.equal(edited.status, 200);

  const reordered = await api("PUT", "/listing-faqs/reorder", {
    json: { ...MORALEJA_VENTA, ids: [second.body.faq._id, first.body.faq._id] },
  });
  assert.equal(reordered.status, 200);
  assert.deepEqual(
    reordered.body.faqs.map((f) => [f.question, f.order]),
    [["¿Segunda editada?", 0], ["¿Primera?", 1]],
  );

  const deleted = await api("DELETE", `/listing-faqs/${second.body.faq._id}`);
  assert.equal(deleted.status, 200);
  page = await api("GET", pageQuery(MORALEJA_VENTA), { auth: false });
  assert.deepEqual(page.body.faqs.map((f) => [f.question, f.order]), [["¿Primera?", 0]]);

  // Venta y alquiler a la vez: página propia, no mezcla las de venta
  await api("POST", "/listing-faqs", {
    json: { ...MORALEJA_VENTA, operation: "todas", question: "¿Ambas?", answer: "Sí." },
  });
  const both = await api("GET", pageQuery({ ...MORALEJA_VENTA, operation: "todas" }), { auth: false });
  assert.deepEqual(both.body.faqs.map((f) => f.question), ["¿Ambas?"]);

  const pages = await api("GET", "/listing-faqs/pages", { auth: false });
  assert.deepEqual(
    pages.body.pages.map((p) => [p.zone, p.operation, p.count]),
    [["la-moraleja", "alquiler", 1], ["la-moraleja", "todas", 1], ["la-moraleja", "venta", 1]],
  );
});

test("sin sesión no se puede escribir", { skip: SKIP }, async () => {
  const body = { ...MORALEJA_VENTA, question: "¿X?", answer: "Y." };
  assert.equal((await api("POST", "/listing-faqs", { json: body, auth: false })).status, 401);
  assert.equal((await api("PUT", "/listing-faqs/reorder", { json: body, auth: false })).status, 401);
  assert.equal((await api("DELETE", "/listing-faqs/000000000000000000000000", { auth: false })).status, 401);
});

test("errores de entrada", { skip: SKIP }, async () => {
  const unknownZone = await api("POST", "/listing-faqs", {
    json: { ...MORALEJA_VENTA, zone: "no-existe", question: "¿X?", answer: "Y." },
  });
  assert.equal(unknownZone.status, 400);

  const badPage = await api("GET", "/listing-faqs?department=residencial&operation=venta", { auth: false });
  assert.equal(badPage.status, 400);

  const missing = await api("PUT", "/listing-faqs/000000000000000000000000", {
    json: { question: "¿X?", answer: "Y." },
  });
  assert.equal(missing.status, 404);

  const badId = await api("DELETE", "/listing-faqs/no-es-un-id");
  assert.equal(badId.status, 404);

  // El reorden tiene que incluir todas las FAQs de la página
  const created = await api("POST", "/listing-faqs", {
    json: { ...MORALEJA_VENTA, zone: "el-viso", question: "¿A?", answer: "A." },
  });
  await api("POST", "/listing-faqs", {
    json: { ...MORALEJA_VENTA, zone: "el-viso", question: "¿B?", answer: "B." },
  });
  const partial = await api("PUT", "/listing-faqs/reorder", {
    json: { ...MORALEJA_VENTA, zone: "el-viso", ids: [created.body.faq._id] },
  });
  assert.equal(partial.status, 400);
});

test("traducciones: el CRM las guarda y la web las recibe en su idioma", { skip: SKIP }, async () => {
  const page = { ...MORALEJA_VENTA, zone: "el-viso", operation: "alquiler" };
  const created = await api("POST", "/listing-faqs", {
    json: {
      ...page,
      question: "¿Se admiten mascotas?",
      answer: "Depende del propietario.",
      translations: { en: { question: "Are pets allowed?", answer: "It depends on the owner." } },
    },
  });
  assert.equal(created.status, 201);
  // Respuesta para el CRM: español + estado de la traducción
  assert.equal(created.body.faq.question, "¿Se admiten mascotas?");
  assert.equal(created.body.faq.translations.en.question.value, "Are pets allowed?");
  assert.equal(created.body.faq.translations.en.question.outdated, false);

  const en = await api("GET", `${pageQuery(page)}&lang=en`, { auth: false });
  assert.equal(en.body.faqs[0].question, "Are pets allowed?");
  assert.deepEqual(en.body.faqs[0].translatedLangs, ["en"]);
  assert.equal(en.body.faqs[0].translations, undefined);

  // Sin traducción al francés: se muestra en español
  const fr = await api("GET", `${pageQuery(page)}&lang=fr`, { auth: false });
  assert.equal(fr.body.faqs[0].question, "¿Se admiten mascotas?");
  assert.deepEqual(fr.body.faqs[0].translatedLangs, ["en"]);

  // Cambia el español: la traducción queda desactualizada, pero no se borra
  const id = created.body.faq._id;
  const edited = await api("PUT", `/listing-faqs/${id}`, {
    json: { question: "¿Se admiten mascotas en el piso?", answer: "Depende del propietario." },
  });
  assert.equal(edited.body.faq.translations.en.question.outdated, true);
  assert.equal(edited.body.faq.translations.en.answer.outdated, false);

  // Vaciar una traducción la borra
  const cleared = await api("PUT", `/listing-faqs/${id}`, {
    json: {
      question: "¿Se admiten mascotas en el piso?",
      answer: "Depende del propietario.",
      translations: { en: { question: "", answer: "" } },
    },
  });
  assert.equal(cleared.body.faq.translations?.en?.question, undefined);
  const enAfter = await api("GET", `${pageQuery(page)}&lang=en`, { auth: false });
  assert.deepEqual(enAfter.body.faqs[0].translatedLangs, []);
});

