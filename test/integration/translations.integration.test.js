// Prueba de extremo a extremo de las traducciones: CRM → base de datos → web.
//
// Monta los routers reales sobre una base de datos en memoria, así que no toca
// ninguna base de datos real ni hace llamadas externas. Necesita el paquete
// `mongodb-memory-server`; si no está instalado, la prueba se omite.

const test = require("node:test");
const assert = require("node:assert/strict");

let MongoMemoryServer;
try {
  ({ MongoMemoryServer } = require("mongodb-memory-server"));
} catch (error) {
  MongoMemoryServer = null;
}

const SKIP = MongoMemoryServer
  ? false
  : "requiere mongodb-memory-server (npm i -D mongodb-memory-server)";

// Entorno ficticio: nada de credenciales reales ni de avisos a la web pública
Object.assign(process.env, {
  S3_ENDPOINT: "http://127.0.0.1:9",
  BUCKET_NAME: "test-bucket",
  AWS_ACCESS_KEY_ID: "test",
  AWS_SECRET_ACCESS_KEY: "test",
  FRONTEND_URL: "http://127.0.0.1:9",
  ENABLE_REVALIDATION: "false",
});
delete process.env.TRANSLATION_LANGS;

const ctx = {};

const api = async (method, path, { json, form } = {}) => {
  const options = { method };

  if (json) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(json);
  }
  if (form) {
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    options.body = data;
  }

  const response = await fetch(`${ctx.baseUrl}${path}`, options);
  const text = await response.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch (error) {
    // respuesta no JSON: se devuelve el texto
  }

  return { status: response.status, body };
};

// Cuerpo plano que envía el formulario de anuncio del CRM
const toCrmAdBody = (ad, overrides = {}) => ({
  id: String(ad._id),
  title: ad.title,
  adReference: ad.adReference,
  adStatus: ad.adStatus,
  showOnWeb: ad.showOnWeb,
  featuredOnMain: ad.featuredOnMain,
  adType: ad.adType,
  adBuildingType: ad.adBuildingType,
  department: ad.department,
  zone: (ad.zone || []).map(String),
  street: ad.adDirection.address.street,
  directionNumber: ad.adDirection.address.directionNumber,
  city: ad.adDirection.city,
  webSubtitle: ad.webSubtitle,
  floor: ad.floor,
  disponibility: ad.disponibility,
  surfacesBox: ad.surfacesBox,
  web: ad.description?.web,
  emailPDF: ad.description?.emailPDF,
  distribution: ad.description?.distribution,
  saleValue: ad.sale?.saleValue,
  saleShowOnWeb: ad.sale?.saleShowOnWeb,
  rentValue: ad.rent?.rentValue,
  rentShowOnWeb: ad.rent?.rentShowOnWeb,
  reformed: ad.quality?.reformed,
  ...overrides,
});

const AD_TRANSLATIONS = {
  en: {
    title: "Office in Recoletos",
    // campo no traducible: el backend debe ignorarlo
    webSubtitle: "Prime office",
    description: { web: "<p>Bright office</p>", distribution: "Open plan" },
    floor: "Third",
    disponibility: "Immediate",
    surfacesBox: [
      { surfaceFloor: "Ground", surfaceUse: "Retail", surfaceDisponibility: "Immediate" },
      { surfaceFloor: "First", surfaceUse: "Office", surfaceDisponibility: "" },
    ],
  },
  fr: { title: "Bureau à Recoletos" },
};

test.before(async () => {
  if (SKIP) return;

  const express = require("express");
  const mongoose = require("mongoose");

  ctx.mongo = await MongoMemoryServer.create();
  ctx.mongoose = mongoose;
  await mongoose.connect(ctx.mongo.getUri());

  const { resolveRequestLang } = require("../../src/middlewares/lang.middleware");
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(resolveRequestLang);
  app.use("/ads", require("../../src/routes/ad.routes"));
  app.use("/web", require("../../src/routes/web.routes"));
  app.use("/blogs", require("../../src/routes/blog.routes"));
  app.use("/zones", require("../../src/routes/zone.routes"));
  app.use("/offices", require("../../src/routes/office.routes"));

  await new Promise((resolve) => {
    ctx.server = app.listen(0, "127.0.0.1", resolve);
  });
  ctx.baseUrl = `http://127.0.0.1:${ctx.server.address().port}`;

  const Zone = require("../../src/models/zone.model");
  const Ad = require("../../src/models/ad.model");
  const Blog = require("../../src/models/blog.model");
  const Office = require("../../src/models/office.model");
  const WebHome = require("../../src/models/webHome.model");
  Object.assign(ctx, { Zone, Ad, Blog, Office, WebHome });

  ctx.zone = await Zone.create({
    zone: "Patrimonial",
    name: "Recoletos",
    zoneDescription: "Zona prime de Madrid",
  });

  const baseAd = {
    adReference: "REF-100",
    adStatus: "Activo",
    showOnWeb: true,
    featuredOnMain: true,
    adType: ["Venta", "Alquiler"],
    adBuildingType: ["Oficina"],
    department: "Patrimonio",
    zone: [ctx.zone._id],
    adDirection: {
      address: { street: "Recoletos", directionNumber: "1" },
      city: "Madrid",
    },
    webSubtitle: "Oficina prime",
    floor: "Tercera",
    disponibility: "Inmediata",
    surfacesBox: [
      { id: 1, surfaceFloor: "Baja", surfaceUse: "Local", metersAvailables: "100", metersPrice: "20", surfaceDisponibility: "Inmediata" },
      { id: 2, surfaceFloor: "Primera", surfaceUse: "Oficina", metersAvailables: "80", metersPrice: "18", surfaceDisponibility: "Enero" },
    ],
    sale: { saleValue: 1000000, saleShowOnWeb: true },
    rent: { rentValue: 5000, rentShowOnWeb: true },
    quality: { reformed: true, others: {} },
    description: {
      web: "<p>Oficina luminosa</p>",
      emailPDF: "Oficina para email",
      distribution: "Planta diáfana",
    },
    images: { main: "https://cdn.test/main.jpg", media: "https://cdn.test/video.mp4" },
  };

  ctx.ad = await Ad.create({ ...baseAd, title: "Oficina en Recoletos" });
  ctx.sibling = await Ad.create({
    ...baseAd,
    title: "Oficina gemela en Recoletos",
    featuredOnMain: false,
  });

  ctx.blog = await Blog.create({
    title: "El mercado en Madrid",
    description: "Resumen del mercado",
    content: "<p>Contenido</p>",
    image: "https://cdn.test/blog.jpg",
    tags: ["Mercado", "Madrid"],
    seoTitle: "Mercado Madrid",
  });

  ctx.office = await Office.create({
    name: "Oficina Lagasca",
    address: "Lagasca 36",
    schedule: "<ul><li>Lunes a viernes</li></ul>",
    phone: "910000000",
    image: "https://cdn.test/office.jpg",
  });

  ctx.home = await WebHome.create({
    videoSection: {
      title: "Vídeos destacados",
      subtitle: ["Primera línea", "Segunda línea"],
      videos: [
        {
          adId: ctx.ad._id,
          videoUrl: "https://cdn.test/video.mp4",
          title: ctx.ad.title,
          slug: ctx.ad.slug,
          adReference: ctx.ad.adReference,
        },
      ],
    },
    categoriesSection: {
      residential: { title: "Residencial", subtitle: "Vive en Madrid" },
      location2: { title: "Marbella", subtitle: "Costa del Sol" },
    },
    talkWithUs: {
      titleHome: "Hable con nosotros",
      titleContact: "Contacta",
      descriptionContact: "Le atendemos",
      contactButton: "Enviar",
      directions: ["Lagasca 36"],
    },
    services: {
      residenciales: {
        title: "Servicios residenciales",
        subtitle: "Para su hogar",
        cards: [{ text: "Compra" }, { text: "Alquiler" }],
      },
      patrimoniales: { title: "Patrimoniales", cards: [] },
      transversales: { title: "Transversales", cards: [] },
    },
  });
});

test.after(async () => {
  if (SKIP) return;
  await new Promise((resolve) => ctx.server.close(resolve));
  await ctx.mongoose.disconnect();
  await ctx.mongo.stop();
});

const reloadAd = () => ctx.Ad.findById(ctx.ad._id).lean();
const adDetail = async (lang) =>
  (await api("GET", `/web/ad-details/${(await reloadAd()).slug}${lang ? `?lang=${lang}` : ""}`)).body;

test("anuncio: el CRM guarda traducciones y la web las sirve por idioma", { skip: SKIP }, async () => {
  const saved = await api("PUT", "/ads/edit", {
    json: toCrmAdBody(await reloadAd(), { translations: AD_TRANSLATIONS }),
  });
  assert.equal(saved.status, 200);

  // Respuesta para el CRM: traducciones con estado y sin marcar como antiguas
  const crmEntry = saved.body.translations.en.title;
  assert.equal(crmEntry.value, "Office in Recoletos");
  assert.equal(crmEntry.status, "manual");
  assert.equal(crmEntry.outdated, false);
  assert.equal(saved.body.translations.de, undefined);
  // el subtítulo web no es traducible: aunque llegue, no se guarda
  assert.equal(saved.body.translations.en.webSubtitle, undefined);

  // El español no se ha tocado
  const stored = await reloadAd();
  assert.equal(stored.title, "Oficina en Recoletos");
  assert.equal(stored.description.web, "<p>Oficina luminosa</p>");
  assert.equal(stored.description.emailPDF, "Oficina para email");

  const en = await adDetail("en");
  assert.equal(en.title, "Office in Recoletos");
  assert.equal(en.description, "<p>Bright office</p>");
  assert.equal(en.distribution, "Open plan");
  assert.equal(en.specs.floor, "Third");
  assert.equal(en.specs.disponibility, "Immediate");
  assert.equal(en.priceLabel, "Sale and Rent");
  assert.equal(en.period, "month");
  assert.deepEqual(en.tags, ["Oficina", "Refurbished"]);
  assert.equal(en.surfacesBox[0].surfaceFloor, "Ground");
  assert.equal(en.surfacesBox[0].metersAvailables, "100");
  // celda sin traducir → español
  assert.equal(en.surfacesBox[1].surfaceDisponibility, "Enero");
  // los valores que la web usa como claves siguen en español
  assert.deepEqual(en.operation, ["Venta", "Alquiler"]);
  assert.equal(en.category, "Patrimonio");
  assert.equal(en.zoneName, "Recoletos");
  assert.equal("translations" in en, false);
  // inglés tiene título y descripción traducidos; francés solo el título
  assert.deepEqual(en.translatedLangs, ["en"]);

  // Francés: solo el título está traducido, el resto cae al español
  const fr = await adDetail("fr");
  assert.equal(fr.title, "Bureau à Recoletos");
  assert.equal(fr.description, "<p>Oficina luminosa</p>");
  assert.equal(fr.priceLabel, "Vente et Location");

  // Alemán sin traducir, español explícito y sin idioma: todo en español
  const es = await adDetail("es");
  const none = await adDetail();
  const de = await adDetail("de");
  assert.equal(de.title, "Oficina en Recoletos");
  assert.equal(de.priceLabel, "Kauf und Miete");
  assert.equal(es.title, "Oficina en Recoletos");
  assert.equal(es.priceLabel, "Venta y Alquiler");
  // sin idioma (CRM y llamadas antiguas) la respuesta no gana campos nuevos
  assert.equal("translatedLangs" in none, false);
  const { translatedLangs, ...esWithoutLangs } = es;
  assert.deepEqual(translatedLangs, ["en"]);
  assert.deepEqual(esWithoutLangs, none);
});

test("anuncio: listados, destacados, similares, buscador y GET del CRM", { skip: SKIP }, async () => {
  const list = await api("POST", "/web/filtered-ads", {
    json: { department: "Patrimonial", zone: "madrid", lang: "en" },
  });
  const card = list.body.data.find((item) => item.id === String(ctx.ad._id));
  assert.equal(card.title, "Office in Recoletos");
  assert.deepEqual(card.operation, ["Venta", "Alquiler"]);
  assert.deepEqual(card.tags, ["Oficina", "Refurbished", "Sale", "Rent"]);
  // el idioma no se cuela como filtro: siguen saliendo los dos anuncios
  assert.equal(list.body.pagination.total, 2);

  const byDate = await api("POST", "/web/filtered-ads", {
    json: { department: "Patrimonio", sort: "creat-asc", lang: "fr" },
  });
  assert.ok(byDate.body.data.some((item) => item.title === "Bureau à Recoletos"));

  const highlight = await api("GET", "/web/highlight-ads?lang=en");
  assert.equal(highlight.body[0].title, "Office in Recoletos");

  const similar = await api("GET", `/web/similar/${ctx.sibling._id}?lang=en`);
  assert.equal(similar.body[0].title, "Office in Recoletos");

  const found = await api("POST", "/web/search-by-reference", {
    json: { reference: "Office in", lang: "en" },
  });
  assert.equal(found.status, 200);
  assert.equal(found.body.data[0].title, "Office in Recoletos");

  // Sin idioma no se busca en las traducciones
  const notFound = await api("POST", "/web/search-by-reference", {
    json: { reference: "Office in" },
  });
  assert.equal(notFound.status, 404);

  const crm = await api("GET", `/ads/${ctx.ad._id}`);
  assert.equal(crm.body.translations.fr.title.value, "Bureau à Recoletos");
  assert.equal(crm.body.translations.en.surfacesBox.outdated, false);

  // Los listados del CRM no arrastran las traducciones
  const crmList = await api("GET", "/ads");
  assert.equal(crmList.body.length, 2);
  assert.ok(crmList.body.every((item) => !("translations" in item)));
  assert.equal(crmList.body.find((item) => item._id === String(ctx.ad._id)).title, "Oficina en Recoletos");
});

test("anuncio: un guardado sin traducciones (CRM antiguo) no borra las existentes", { skip: SKIP }, async () => {
  const saved = await api("PUT", "/ads/edit", { json: toCrmAdBody(await reloadAd()) });
  assert.equal(saved.status, 200);

  const stored = await reloadAd();
  assert.equal(stored.translations.en.title.value, "Office in Recoletos");
  assert.equal(stored.translations.en.description.web.value, "<p>Bright office</p>");
  assert.equal(stored.translations.fr.title.value, "Bureau à Recoletos");
});

test("anuncio: si cambia el español la traducción queda desactualizada hasta revisarla", { skip: SKIP }, async () => {
  const before = await reloadAd();

  const saved = await api("PUT", "/ads/edit", {
    json: toCrmAdBody(before, {
      title: "Oficina reformada en Recoletos",
      translations: AD_TRANSLATIONS,
    }),
  });

  assert.equal(saved.body.translations.en.title.outdated, true);
  assert.equal(saved.body.translations.en.title.value, "Office in Recoletos");
  assert.equal(saved.body.translations.en.description.web.outdated, false);
  // reenviar el mismo texto no cambia ni la fecha ni el estado
  assert.equal(
    new Date(saved.body.translations.en.title.updatedAt).getTime(),
    new Date(before.translations.en.title.updatedAt).getTime(),
  );

  // La web sigue mostrando la traducción (mejor que mezclar idiomas)
  assert.equal((await adDetail("en")).title, "Office in Recoletos");

  // Darla por buena sin cambiar el texto
  const confirmed = await api("PUT", "/ads/edit", {
    json: toCrmAdBody(await reloadAd(), { translationsConfirmed: { en: ["title"] } }),
  });
  assert.equal(confirmed.body.translations.en.title.outdated, false);
  assert.equal(confirmed.body.translations.en.title.value, "Office in Recoletos");
  assert.equal(confirmed.body.translations.fr.title.outdated, true);
});

test("anuncio: vaciar una traducción la borra y vaciar el español oculta la suya", { skip: SKIP }, async () => {
  await api("PUT", "/ads/edit", {
    json: toCrmAdBody(await reloadAd(), {
      distribution: "",
      translations: { fr: { title: "" }, en: { floor: null } },
    }),
  });

  const stored = await reloadAd();
  assert.equal(stored.translations.fr?.title, undefined);
  assert.equal(stored.translations.en.floor, undefined);
  // la traducción de la distribución sigue guardada pero ya no se muestra
  assert.equal(stored.translations.en.description.distribution.value, "Open plan");

  const en = await adDetail("en");
  assert.equal(en.distribution, "");
  assert.equal(en.specs.floor, "Tercera");
  assert.equal((await adDetail("fr")).title, "Oficina reformada en Recoletos");
});

test("anuncio: un cuerpo de traducciones mal formado se rechaza sin guardar nada", { skip: SKIP }, async () => {
  const before = await reloadAd();

  const rejected = await api("PUT", "/ads/edit", {
    json: toCrmAdBody(before, { title: "No debe guardarse", translations: "{roto" }),
  });
  assert.equal(rejected.status, 400);
  assert.match(rejected.body.message, /translations/);

  // un tipo inesperado dentro de un campo se ignora, no borra
  await api("PUT", "/ads/edit", {
    json: toCrmAdBody(before, { translations: { en: { title: 12345, surfacesBox: "x" } } }),
  });

  const after = await reloadAd();
  assert.equal(after.title, before.title);
  assert.equal(after.translations.en.title.value, "Office in Recoletos");
  assert.equal(after.translations.en.surfacesBox.value.length, 2);
});

test("anuncio: el cuadro de superficies traducido se replica a los de misma referencia", { skip: SKIP }, async () => {
  const current = await reloadAd();
  const surfacesBox = [
    { id: 1, surfaceFloor: "Baja", surfaceUse: "Local comercial", surfaceDisponibility: "Inmediata" },
  ];

  await api("PUT", "/ads/edit", {
    json: toCrmAdBody(current, {
      surfacesBox,
      updateSameRef: true,
      translations: {
        en: { surfacesBox: [{ surfaceFloor: "Ground", surfaceUse: "Retail unit", surfaceDisponibility: "Immediate" }] },
      },
    }),
  });

  const sibling = await ctx.Ad.findById(ctx.sibling._id).lean();
  assert.equal(sibling.surfacesBox[0].surfaceUse, "Local comercial");
  assert.equal(sibling.translations.en.surfacesBox.value[0].surfaceUse, "Retail unit");
  // el resto de textos del anuncio gemelo no se tocan
  assert.equal(sibling.translations.en.title, undefined);
  assert.equal(sibling.title, "Oficina gemela en Recoletos");

  const siblingDetail = await api("GET", `/web/ad-details/${sibling.slug}?lang=en`);
  assert.equal(siblingDetail.body.surfacesBox[0].surfaceUse, "Retail unit");
  assert.equal(siblingDetail.body.title, "Oficina gemela en Recoletos");
});

test("anuncio: al duplicar se copian las traducciones y se pueden cambiar", { skip: SKIP }, async () => {
  const original = await reloadAd();
  const { id, ...body } = toCrmAdBody(original, {
    idCopy: String(original._id),
    title: "Copia de oficina",
    translations: { en: { disponibility: "Copied availability" } },
  });

  const created = await api("POST", "/ads/create", { json: body });
  assert.equal(created.status, 200);

  const { translations } = created.body;
  // heredada del original; como el título en español es otro, queda por revisar
  assert.equal(translations.en.title.value, "Office in Recoletos");
  assert.equal(translations.en.title.outdated, true);
  // heredada y al día
  assert.equal(translations.en.description.web.outdated, false);
  // cambiada en el propio alta
  assert.equal(translations.en.disponibility.value, "Copied availability");
  // el original no cambia
  assert.equal((await reloadAd()).translations.en.disponibility.value, "Immediate");

  const plain = await api("POST", "/ads/create", {
    json: { ...body, idCopy: undefined, title: "Anuncio nuevo sin copia", translations: undefined },
  });
  assert.equal("translations" in plain.body, false);
});

test("zona: descripción traducida en la ficha del anuncio", { skip: SKIP }, async () => {
  const saved = await api("PATCH", `/zones/${ctx.zone._id}/description`, {
    json: {
      zoneDescription: "Zona prime de Madrid",
      translations: { en: { zoneDescription: "Prime area of Madrid" } },
    },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.zone.translations.en.zoneDescription.outdated, false);

  assert.equal((await adDetail("en")).zoneDescription, "Prime area of Madrid");
  assert.equal((await adDetail("de")).zoneDescription, "Zona prime de Madrid");

  // Guardar solo el español (CRM antiguo) conserva la traducción y la marca
  await api("PATCH", `/zones/${ctx.zone._id}/description`, {
    json: { zoneDescription: "Zona prime renovada" },
  });
  const grouped = await api("GET", "/zones/grouped");
  const zone = grouped.body.find((group) => group.category === "Patrimonial").zones[0];
  assert.equal(zone.zoneDescription, "Zona prime renovada");
  assert.equal(zone.translations.en.zoneDescription.value, "Prime area of Madrid");
  assert.equal(zone.translations.en.zoneDescription.outdated, true);

  assert.equal((await api("PATCH", "/zones/000000000000000000000000/description", { json: {} })).status, 404);
});

test("blog: traducciones por formulario multipart y etiquetas", { skip: SKIP }, async () => {
  const saved = await api("PATCH", `/blogs/update/${ctx.blog._id}`, {
    form: {
      title: "El mercado en Madrid",
      description: "Resumen del mercado",
      content: "<p>Contenido</p>",
      tags: JSON.stringify(["Mercado", "Madrid"]),
      translations: JSON.stringify({
        en: {
          title: "The Madrid market",
          content: "<p>Content</p>",
          seoTitle: "Madrid market",
          tags: ["Market", ""],
        },
      }),
    },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.blog.translations.en.title.outdated, false);
  // el campo en bruto no se ha colado en el documento
  assert.equal(typeof saved.body.blog.translations, "object");
  assert.equal(saved.body.blog.title, "El mercado en Madrid");

  const stored = await ctx.Blog.findById(ctx.blog._id).lean();
  assert.equal(stored.slug, ctx.blog.slug);

  const list = await api("GET", "/blogs/getAllPaginated?lang=en");
  const post = list.body.blogs[0];
  assert.equal(post.title, "The Madrid market");
  assert.equal(post.description, "Resumen del mercado");
  assert.equal(post.seoTitle, "Madrid market");
  assert.deepEqual(post.tags, ["Mercado", "Madrid"]);
  assert.deepEqual(post.tagLabels, ["Market", "Madrid"]);
  assert.deepEqual(post.translatedLangs, ["en"]);
  assert.equal("translations" in post, false);

  const detail = await api("GET", `/blogs/getDetails/${ctx.blog.slug}?lang=en`);
  assert.equal(detail.body.content, "<p>Content</p>");

  // El filtro sigue funcionando con la etiqueta en español
  const byTag = await api("GET", "/blogs/getAllPaginated?tag=Mercado&lang=en");
  assert.equal(byTag.body.total, 1);

  assert.deepEqual((await api("GET", "/blogs/getTags?lang=en")).body, [
    { value: "Madrid", label: "Madrid" },
    { value: "Mercado", label: "Market" },
  ]);
  assert.deepEqual((await api("GET", "/blogs/getTags?lang=es")).body, [
    { value: "Madrid", label: "Madrid" },
    { value: "Mercado", label: "Mercado" },
  ]);
  // Sin idioma, la forma de siempre
  assert.deepEqual((await api("GET", "/blogs/getTags")).body, ["Madrid", "Mercado"]);
  assert.equal((await api("GET", "/blogs/getAllPaginated")).body.blogs[0].title, "El mercado en Madrid");

  // Lista del CRM: con traducciones y su estado
  const crm = await api("GET", "/blogs/getAll");
  assert.equal(crm.body[0].translations.en.tags.outdated, false);

  const rejected = await api("PATCH", `/blogs/update/${ctx.blog._id}`, {
    form: { title: "No debe guardarse", translations: "[1,2]" },
  });
  assert.equal(rejected.status, 400);
  assert.equal((await ctx.Blog.findById(ctx.blog._id).lean()).title, "El mercado en Madrid");
});

test("oficinas y contacto: traducciones y respuesta por idioma", { skip: SKIP }, async () => {
  const office = await api("PATCH", `/offices/update/${ctx.office._id}`, {
    form: {
      name: "Oficina Lagasca",
      schedule: "<ul><li>Lunes a viernes</li></ul>",
      translations: JSON.stringify({ en: { schedule: "<ul><li>Monday to Friday</li></ul>" } }),
    },
  });
  assert.equal(office.status, 200);
  assert.equal(office.body.office.translations.en.schedule.outdated, false);

  const contact = await api("PUT", `/web/home/talkwhitus/edit/${ctx.home._id}`, {
    form: {
      titleHome: "Hable con nosotros",
      titleContact: "Contacta",
      descriptionContact: "Le atendemos",
      contactButton: "Enviar",
      directions: "Lagasca 36",
      translations: JSON.stringify({
        en: { talkWithUs: { titleHome: "Talk to us", contactButton: "Send" } },
      }),
    },
  });
  assert.equal(contact.status, 200);
  assert.equal(contact.body.translations.en.talkWithUs.titleHome.outdated, false);

  const en = (await api("GET", "/web/contact-and-offices?lang=en")).body.data;
  assert.equal(en.titleHome, "Talk to us");
  assert.equal(en.contactButton, "Send");
  assert.equal(en.titleContact, "Contacta");
  assert.deepEqual(en.directions, ["Lagasca 36"]);
  assert.equal(en.offices[0].schedule, "<ul><li>Monday to Friday</li></ul>");
  assert.equal(en.offices[0].name, "Oficina Lagasca");
  assert.equal("translations" in en.offices[0], false);

  const none = (await api("GET", "/web/contact-and-offices")).body.data;
  assert.equal(none.titleHome, "Hable con nosotros");
  assert.equal(none.offices[0].schedule, "<ul><li>Lunes a viernes</li></ul>");

  const crmOffices = await api("GET", "/offices/getAll");
  assert.equal(crmOffices.body[0].translations.en.schedule.value, "<ul><li>Monday to Friday</li></ul>");
});

test("home y servicios: bloques traducidos y título de vídeo tomado del anuncio", { skip: SKIP }, async () => {
  const video = await api("PUT", `/web/home/videosection/edit/${ctx.home._id}`, {
    json: {
      title: "Vídeos destacados",
      translations: {
        en: { videoSection: { title: "Featured videos", subtitle: ["First line", "Second line"] } },
      },
    },
  });
  assert.equal(video.status, 200);

  const category = await api("PUT", `/web/home/categories-section/edit/${ctx.home._id}`, {
    form: {
      key: "residential",
      title: "Residencial",
      subtitle: "Vive en Madrid",
      translations: JSON.stringify({
        en: { categoriesSection: { residential: { title: "Residential", subtitle: "Live in Madrid" } } },
      }),
    },
  });
  assert.equal(category.status, 200);

  const services = await api("PUT", `/web/services/${ctx.home._id}`, {
    form: {
      key: "residenciales",
      title: "Servicios residenciales",
      subtitle: "Para su hogar",
      cardsText: JSON.stringify(["Compra", "Alquiler"]),
      translations: JSON.stringify({
        en: { services: { residenciales: { title: "Residential services", cards: [{ text: "Buying" }, { text: "Renting" }] } } },
      }),
    },
  });
  assert.equal(services.status, 200);

  const [en] = (await api("GET", "/web/home?lang=en")).body;
  assert.equal(en.videoSection.title, "Featured videos");
  assert.deepEqual(en.videoSection.subtitle, ["First line", "Second line"]);
  assert.equal(en.videoSection.videos[0].title, "Office in Recoletos");
  assert.equal(en.categoriesSection.residential.title, "Residential");
  assert.equal(en.categoriesSection.residential.subtitle, "Live in Madrid");
  // sin traducir → español; y el contador sigue calculándose
  assert.equal(en.categoriesSection.location2.title, "Marbella");
  assert.equal(typeof en.categoriesSection.residential.count, "number");
  assert.equal(en.talkWithUs.titleHome, "Talk to us");
  assert.equal("translations" in en, false);
  assert.equal("translations" in (en.videoSection.videos[0].adId || {}), false);

  const [de] = (await api("GET", "/web/home?lang=de")).body;
  assert.equal(de.videoSection.title, "Vídeos destacados");
  assert.equal(de.videoSection.videos[0].title, "Oficina reformada en Recoletos");

  // CRM: documento completo, en español, con el estado de cada traducción
  const [crm] = (await api("GET", "/web/home")).body;
  assert.equal(crm.videoSection.title, "Vídeos destacados");
  assert.equal(crm.videoSection.videos[0].title, "Oficina reformada en Recoletos");
  assert.equal(crm.translations.en.videoSection.title.outdated, false);
  assert.equal(crm.translations.en.services.residenciales.cards.value[1].text, "Renting");

  const servicesEn = (await api("GET", "/web/services/get?lang=en")).body.data;
  assert.equal(servicesEn.residenciales.title, "Residential services");
  assert.equal(servicesEn.residenciales.subtitle, "Para su hogar");
  assert.deepEqual(servicesEn.residenciales.cards.map((card) => card.text), ["Buying", "Renting"]);
  assert.ok(servicesEn.residenciales.cards[0]._id);
  assert.equal(servicesEn.patrimoniales.title, "Patrimoniales");

  const servicesNone = (await api("GET", "/web/services/get")).body.data;
  assert.deepEqual(servicesNone.residenciales.cards.map((card) => card.text), ["Compra", "Alquiler"]);

  // Si en español cambian las tarjetas (una más), la lista traducida ya no
  // encaja y la web vuelve al español hasta que se retraduzca
  await api("PUT", `/web/services/${ctx.home._id}`, {
    form: { key: "residenciales", cardsText: JSON.stringify(["Compra", "Alquiler", "Gestión"]) },
  });
  const afterChange = (await api("GET", "/web/services/get?lang=en")).body.data;
  assert.deepEqual(afterChange.residenciales.cards.map((card) => card.text), ["Compra", "Alquiler", "Gestión"]);
  assert.equal(afterChange.residenciales.title, "Residential services");
  const [crmAfter] = (await api("GET", "/web/home")).body;
  assert.equal(crmAfter.translations.en.services.residenciales.cards.outdated, true);
});
