const express = require("express");

const { upload, uploadFiles } = require("../middlewares/file.middleware");
const {
  consultantGetAll,
  consultantGetOne,
  consultantDelete,
  consultantUpdate,
  deleteConsultantImage,
  consultantGetNameAndIds,
} = require("../controllers/consultant.controller");
const { registerPost } = require("../controllers/auth.controller");

const router = express.Router();

router.get("/", consultantGetAll);
router.get("/names-and-ids", consultantGetNameAndIds);
router.get("/:id", consultantGetOne);

router.post(
  "/create",
  upload.fields([{ name: "avatar" }, { name: "companyUnitLogo" }]),
  registerPost,
);
router.put(
  "/edit",
  uploadFiles.fields([
    { name: "avatar" },
    { name: "companyUnitLogo" },
    { name: "high_zone1_backgroundImage" },
    { name: "high_zone2_backgroundImage" },
    { name: "high_zone3_backgroundImage" },
    { name: "medium_zone4_backgroundImage" },
    { name: "medium_zone5_backgroundImage" },
    { name: "medium_zone6_backgroundImage" },
    { name: "low_zone7_backgroundImage" },
    { name: "low_zone8_backgroundImage" },
    { name: "low_zone9_backgroundImage" },
  ]),
  consultantUpdate,
);

router.put("/delete-image/:type/:id", deleteConsultantImage);

router.delete("/delete/:id", consultantDelete);

module.exports = router;
