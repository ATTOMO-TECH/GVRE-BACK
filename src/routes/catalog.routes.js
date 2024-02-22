const express = require("express");
const {
  catalogGetAll,
  catalogCreate,
  catalogEdit,
  catalogDelete,
  getMainImageCatalogSection,
  uploadMainImageCatalogSection,
  deleteImageCatalogSection,
} = require("../controllers/catalog.controller");
const { uploadFiles, upload } = require("../middlewares/file.middleware");

const router = express.Router();

router.get("/all", catalogGetAll);

router.post(
  "/create",
  //   upload.single("portraidImage catalog"),
  uploadFiles.array("files"),
  catalogCreate
);

router.post(
  "/uploadImageCatalogSection",
  upload.single("mainImageCatalog"),
  uploadMainImageCatalogSection
);

router.get("/getImageCatalogSection", getMainImageCatalogSection);

router.delete("/deleteImageCatalogSection/:id", deleteImageCatalogSection);

router.put("/edit/:id", uploadFiles.array("files"), catalogEdit);

router.delete("/delete/:id", catalogDelete);

module.exports = router;
