const express = require("express");
const { isAuth } = require("../middlewares/auth.middleware");
const {
  extractTranslationsInput,
} = require("../middlewares/translations.middleware");
const {
  getPageFaqs,
  getPagesWithFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  reorderFaqs,
} = require("../controllers/listingFaq.controller");

const router = express.Router();

// Lectura pública: la web pinta las FAQs en los listados. Con `?lang=`
// devuelve cada FAQ en ese idioma (o en español si no está traducida).
router.get("/", getPageFaqs);
router.get("/pages", getPagesWithFaqs);

// Escritura: solo desde el CRM, con sesión iniciada
router.post("/", [isAuth, extractTranslationsInput], createFaq);
router.put("/reorder", isAuth, reorderFaqs);
router.put("/:id", [isAuth, extractTranslationsInput], updateFaq);
router.delete("/:id", isAuth, deleteFaq);

module.exports = router;
