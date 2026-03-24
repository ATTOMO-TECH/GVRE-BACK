const express = require("express");
const {
  sendAdsToContact,
  sendAdToContacts,
  sendEmailReservationToClient,
  unsubscribeEmails,
  sendWebEmail,
} = require("../controllers/mails.controller");
const {
  getConsultantTokenById,
} = require("../controllers/consultant.controller");

const router = express.Router();

router.post("/sendAdsToContact", getConsultantTokenById, sendAdsToContact);
router.post("/sendAdToContacts", getConsultantTokenById, sendAdToContacts);
router.post("/webReservations", sendEmailReservationToClient);
router.get("/unsubscribe/:id", unsubscribeEmails);

router.post("/send-web-email", sendWebEmail);

module.exports = router;
