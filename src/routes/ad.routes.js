const express = require("express");
const { upload, deleteImage } = require("../middlewares/file.middleware");
const {
  adGetAll,
  adGetByFilters,
  adGetOne,
  allAdsGetByIdConsultant,
  adGetMatchedRequests,
  adCreate,
  adUpdate,
  adUpdateSendedTo,
  adUpdateManyConsultantByConsultantId,
  adMainImageUpload,
  adMainImagesDelete,
  adMediaImageUpload,
  adMediaImagesDelete,
  adBlueprintImageUpload,
  adBlueprintImagesDelete,
  adOthersImagesUpload,
  adOthersImagesDelete,
  adDelete,
  repairAds,
  getAdsPaginated,
  adUpdateImageOrder,
  getAdsByContact,
} = require("../controllers/ad.controller");

const router = express.Router();

// router.get("/", isAuth, adGetAll);
// router.get("/matching/:id", isAuth, adGetMatchedRequests);
// router.get("/:id", adGetOne);
// router.post("/create", isAuth, adCreate);
// router.put("/edit", isAuth, adUpdate);
// router.put(
//   "/upload/main/:id",
//   [isAuth, upload.single("main")],
//   adMainImageUpload
// );
// router.put("/delete/main/:id", isAuth, adMainImagesDelete);
// router.put(
//   "/upload/media/:id",
//   [isAuth, upload.single("media")],
//   adMediaImageUpload
// );
// router.put("/delete/media/:id", isAuth, adMediaImagesDelete);
// router.put(
//   "/upload/blueprint/:id",
//   [isAuth, upload.array("blueprint")],
//   adBlueprintImageUpload
// );
// router.put("/delete/blueprint/:id", isAuth, adBlueprintImagesDelete);
// router.put(
//   "/upload/others/:id",
//   [isAuth, upload.array("others")],
//   adOthersImagesUpload
// );
// router.put("/delete/others/:id", isAuth, adOthersImagesDelete);
// router.delete("/delete/:id", [isAuth, isAdmin], adDelete);

router.get("/", adGetAll);
router.get("/filter", adGetByFilters);
router.get("/matching/:id", adGetMatchedRequests);
router.get("/contact/:contactId", getAdsByContact);
router.get("/repair/ads", repairAds);
router.get("/web/:query", getAdsPaginated);
router.get("/:id", adGetOne);
router.get("/consultant/:consultantId", allAdsGetByIdConsultant);
router.post("/create", adCreate);
router.put("/edit", adUpdate);
router.put("/edit/sendedto", adUpdateSendedTo);
router.put(
  "/editmanyconsultant/:currentConsultant",
  adUpdateManyConsultantByConsultantId,
);
router.put("/upload/main/:id", upload.single("main"), adMainImageUpload);
router.put("/delete/main/:id", adMainImagesDelete);
router.put("/upload/media/:id", upload.single("media"), adMediaImageUpload);
router.put("/delete/media/:id", adMediaImagesDelete);
router.put(
  "/upload/blueprint/:id",
  upload.array("blueprint"),
  adBlueprintImageUpload,
);
router.put("/delete/blueprint/:id", adBlueprintImagesDelete);
router.put("/upload/others/:id", upload.array("others"), adOthersImagesUpload);
router.put("/delete/others/:id", adOthersImagesDelete);
router.put("/:id/images/order", adUpdateImageOrder);
router.delete("/delete/:id", adDelete);

module.exports = router;
