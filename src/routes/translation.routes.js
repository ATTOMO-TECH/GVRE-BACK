const express = require("express");
const {
  getTranslationConfig,
  translateWithMachine,
} = require("../controllers/translation.controller");

const router = express.Router();

router.get("/config", getTranslationConfig);
// Traducción automática (DeepL) de los textos de un formulario del CRM
router.post("/machine", translateWithMachine);

module.exports = router;
