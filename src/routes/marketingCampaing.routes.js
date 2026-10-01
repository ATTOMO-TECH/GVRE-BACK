const express = require("express");
const { upload } = require("../middlewares/file.middleware");
const {
  marketingCampaignCreate,
  marketingCampaignUpdate,
  marketingCampaignDelete,
  marketingCampaignSendStatus,
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

router.post("/create", marketingCampaignCreate);
router.put("/edit/:idCampaign", marketingCampaignUpdate);
router.post("/sendEmail", getConsultantTokenById, sendEmailCampaignToContacts);
router.get("/sendStatus/:idSend", marketingCampaignSendStatus);

router.delete("/delete/:idCampaign", marketingCampaignDelete);

module.exports = router;
