const express = require("express");
const { uploadFiles, upload } = require("../middlewares/file.middleware");
const {
  webHomeGet,
  webHomeCreate,
  webHomeEdit,
  webResidentialCategoryImageUpload,
  webPatrimonialCategoryImageUpload,
  webArtCategoryImageUpload,
  webCatalogCategoryImageUpload,
  webCoastCategoryImageUpload,
  webRusticCategoryImageUpload,
  webSingularCategoryImageUpload,
  webInteriorismTextAndImageUpload,
  webSellTextAndImageUpload,
  webOfficeTextAndImageUpload,
  webHomeTalkWithUs,
  webDevelopmentServicesUpload,
  webInteriorismServicesUpload,
  webInvestmentServicesUpload,
  webAssetManagementServicesUpload,
  webCommercializationServicesUpload,
  updateCategoriesSection,
  getHighlightAds,
  webVideoSectionUpdate,
  getAdsByReference,
  getAdDetails,
  getFilteredAds,
  getActiveInventoryZones,
  getSimilarAds,
  getFilterStats,
  getWebServicesPage,
  updateServicesSection,
  getWebConsultants,
  getWebContactAndOfficeData,
} = require("../controllers/web.controller");

const router = express.Router();
// HOME TITLE AND IMAGE
router.get("/home", webHomeGet);
router.post(
  "/home/create",
  //   upload.single("portraidImage catalog"),
  upload.single("homeImage"),
  webHomeCreate,
);
router.put("/home/edit/:id", upload.single("homeImage"), webHomeEdit);

// HOME IMAGE CATEGORIES
router.put(
  "/home/categories/residential/edit/:id",
  //   upload.single("portraidImage catalog"),
  upload.single("residentialImage"),
  webResidentialCategoryImageUpload,
);
router.put(
  "/home/categories/patrimonial/edit/:id",
  //   upload.single("portraidImage catalog"),
  upload.single("patrimonialImage"),
  webPatrimonialCategoryImageUpload,
);
router.put(
  "/home/categories/art/edit/:id",
  //   upload.single("portraidImage catalog"),
  upload.single("artImage"),
  webArtCategoryImageUpload,
);
router.put(
  "/home/categories/catalog/edit/:id",
  //   upload.single("portraidImage catalog"),
  upload.single("catalogImage"),
  webCatalogCategoryImageUpload,
);
router.put(
  "/home/categories/coast/edit/:id",
  //   upload.single("portraidImage catalog"),
  upload.single("coastImage"),
  webCoastCategoryImageUpload,
);
router.put(
  "/home/categories/rustic/edit/:id",
  //   upload.single("portraidImage catalog"),
  upload.single("rusticImage"),
  webRusticCategoryImageUpload,
);
router.put(
  "/home/categories/singular/edit/:id",
  //   upload.single("portraidImage catalog"),
  upload.single("singularImage"),
  webSingularCategoryImageUpload,
);

router.put(
  "/home/interiorism/edit/:id",
  //   upload.single("portraidImage catalog"),
  upload.single("interiorismImage"),
  webInteriorismTextAndImageUpload,
);

router.put(
  "/home/sell/edit/:id",
  //   upload.single("portraidImage catalog"),
  upload.single("sellImage"),
  webSellTextAndImageUpload,
);

router.put(
  "/home/offices/edit/:id",
  //   upload.single("portraidImage catalog"),
  upload.single("officesImage"),
  webOfficeTextAndImageUpload,
);

router.put(
  "/home/talkwhitus/edit/:id",
  upload.single("contactImage"),
  webHomeTalkWithUs,
);

router.put(
  "/services/interiorism/edit/:id",
  //   upload.single("portraidImage catalog"),
  upload.single("interiorimsImage"),
  webInteriorismServicesUpload,
);

router.put(
  "/services/development/edit/:id",
  //   upload.single("portraidImage catalog"),
  upload.single("developmentImage"),
  webDevelopmentServicesUpload,
);

router.put(
  "/services/investment/edit/:id",
  //   upload.single("portraidImage catalog"),
  // upload.single("investMentImage"),
  webInvestmentServicesUpload,
);

router.put(
  "/services/assetManagement/edit/:id",
  //   upload.single("portraidImage catalog"),
  // upload.single("investMentImage"),
  webAssetManagementServicesUpload,
);

router.put(
  "/services/commercialization/edit/:id",
  //   upload.single("portraidImage catalog"),
  // upload.single("investMentImage"),
  webCommercializationServicesUpload,
);

// NUEVA WEB:

// ------------------------------------------------------------------

// HOME
router.put("/home/videosection/edit/:id", webVideoSectionUpdate);
router.get("/home/ads/search", getAdsByReference);
router.put(
  "/home/categories-section/edit/:id",
  upload.single("image"),
  updateCategoriesSection,
);

// SERVICES
router.get("/services/get", getWebServicesPage);
router.put(
  "/services/:id",
  upload.single("image"), // O el nombre del campo que uses para el archivo
  updateServicesSection,
);

// WHO WE ARE
router.get("/who-we-are", getWebConsultants);

router.get("/contact-and-offices", getWebContactAndOfficeData);

// ACITVE ZONES
router.post("/active-inventory-zones", getActiveInventoryZones);

// FILTERED STATS
router.post("/filter-stats", getFilterStats);

//FILTERED ADS
router.post("/filtered-ads", getFilteredAds);

// ------------------------------------------------------------------

// HIGHLIGHT ADS
router.get("/highlight-ads", getHighlightAds);

// ------------------------------------------------------------------

// AD DETAILS
router.get("/ad-details/:slug", getAdDetails);

router.get("/similar/:id", getSimilarAds);

module.exports = router;
