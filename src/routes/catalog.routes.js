const express = require("express");
const {
  catalogGetAll,
  catalogCreate,
  catalogEdit,
  catalogDelete,
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
router.put("/edit/:id", uploadFiles.array("files"), catalogEdit);

router.delete("/delete/:id", catalogDelete);

module.exports = router;
