const express = require("express");
const {
  getTranslationConfig,
} = require("../controllers/translation.controller");

const router = express.Router();

router.get("/config", getTranslationConfig);

module.exports = router;
