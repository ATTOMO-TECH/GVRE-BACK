const mongoose = require("mongoose");
const {
  DEPARTMENTS,
  OPERATIONS,
} = require("../listingFaqs/pageKey");
const { ENTITIES, buildTranslationsDefinition } = require("../i18n");

const Schema = mongoose.Schema;

// Pregunta frecuente de una página de listado de la web
// (ver `src/listingFaqs/pageKey.js`).
const listingFaqSchema = new Schema(
  {
    department: { type: String, enum: DEPARTMENTS, required: true },
    // Ciudad y barrio como aparecen en la URL; null cuando la página no los
    // lleva (listado de ciudad sin barrio, u "Otros activos & zonas")
    city: { type: String, default: null },
    zone: { type: String, default: null },
    operation: { type: String, enum: OPERATIONS, required: true },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    // Posición dentro de la página (0 = primera)
    order: { type: Number, default: 0 },
    // Textos en otros idiomas; el español sigue en `question` y `answer`
    translations: buildTranslationsDefinition(ENTITIES.LISTING_FAQ),
  },
  {
    timestamps: true,
  },
);

listingFaqSchema.index({
  department: 1,
  city: 1,
  zone: 1,
  operation: 1,
  order: 1,
});

const ListingFaq = mongoose.model("listingfaqs", listingFaqSchema);

module.exports = ListingFaq;
