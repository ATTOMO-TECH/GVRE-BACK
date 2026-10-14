const express = require("express");
const { upload } = require("../middlewares/file.middleware");
const {
  getAllOffices,
  createOffice,
  updateOffice,
  deleteOffice,
} = require("../controllers/web.controller");

const {
  extractTranslationsInput,
} = require("../middlewares/translations.middleware");

const router = express.Router();

router.get("/getAll", getAllOffices);
router.post(
  "/create",
  [upload.single("image"), extractTranslationsInput],
  createOffice,
);
router.patch(
  "/update/:id",
  [upload.single("image"), extractTranslationsInput],
  updateOffice,
);
router.delete("/delete/:id", deleteOffice);

module.exports = router;
