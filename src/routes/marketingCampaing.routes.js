const express = require("express");
const { upload } = require("../middlewares/file.middleware");
const {
  marketingCampaignCreate,
  marketingCampaignUpdate,
  marketingCampaignDelete,
  marketingCampaignSendEmail,
  marketingCampaignsGetAll,
} = require("../controllers/marketingCampaing.controller");
const {
  sendEmailCampaignToContacts,
} = require("../middlewares/senEmailCampaign.middleware");
const {
  contactGetAllByMarketingsCampaigns,
} = require("../controllers/contact.controller");
const {
  getConsultantTokenById,
} = require("../controllers/consultant.controller");

const router = express.Router();

router.get("/", marketingCampaignsGetAll);
router.get("/:id", () => {});

router.post("/create", upload.single("campaingLogo"), marketingCampaignCreate);
router.put(
  "/edit/:idCampaign",
  upload.single("campaingLogo"),
  marketingCampaignUpdate
);
router.post(
  "/sendEmail",
  getConsultantTokenById,
  sendEmailCampaignToContacts,
  marketingCampaignSendEmail
);

router.delete("/delete/:idCampaign", marketingCampaignDelete);

module.exports = router;
