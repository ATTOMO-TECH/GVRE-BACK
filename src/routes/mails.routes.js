const express = require("express");
const { isAuth } = require("../middlewares/auth.middleware");
const {
  sendAdsToContact,
  sendAdToContacts,
  sendEmailReservationToClient,
} = require("../controllers/mails.controller");
const {
  getConsultantTokenByEmail,
} = require("../controllers/consultant.controller");

const router = express.Router();

router.post("/sendAdsToContact", getConsultantTokenByEmail, sendAdsToContact);
router.post("/sendAdToContacts", getConsultantTokenByEmail, sendAdToContacts);
router.post("/webReservations", sendEmailReservationToClient);

module.exports = router;
