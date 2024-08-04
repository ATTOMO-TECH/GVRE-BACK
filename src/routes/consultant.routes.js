const express = require("express");
const { isAuth, isAdmin } = require("../middlewares/auth.middleware");
const { upload, uploadFiles } = require("../middlewares/file.middleware");
const {
  consultantGetAll,
  consultantGetOne,
  consultantDelete,
  consultantUpdate,
  deleteConsultantImage,
} = require("../controllers/consultant.controller");
const { registerPost } = require("../controllers/auth.controller");

const router = express.Router();

router.get("/", consultantGetAll);
router.get("/:id", consultantGetOne);

router.post(
  "/create",
  upload.fields([{ name: "avatar" }, { name: "companyUnitLogo" }]),
  registerPost
);
router.put(
  "/edit",
  uploadFiles.fields([
    { name: "avatar" },
    { name: "companyUnitLogo" },
    { name: "high_residential_backgroundImage" },
    { name: "high_patrimonial_backgroundImage" },
    { name: "high_others_backgroundImage" },
    { name: "medium_residential_backgroundImage" },
    { name: "medium_patrimonial_backgroundImage" },
    { name: "medium_others_backgroundImage" },
    { name: "low_residential_backgroundImage" },
    { name: "low_patrimonial_backgroundImage" },
    { name: "low_others_backgroundImage" },
  ]),
  consultantUpdate
);

router.put("/delete-image/:type/:id", deleteConsultantImage);

router.delete("/delete/:id", consultantDelete);

module.exports = router;
