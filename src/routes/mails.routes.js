const express = require("express");
const { isAuth } = require("../middlewares/auth.middleware");
const {
  sendAdsToContact,
  sendAdToContacts,
  sendEmailReservationToClient,
  unsubscribeEmails,
} = require("../controllers/mails.controller");
const {
  getConsultantTokenById,
} = require("../controllers/consultant.controller");

const router = express.Router();

router.post("/sendAdsToContact", getConsultantTokenById, sendAdsToContact);
router.post("/sendAdToContacts", getConsultantTokenById, sendAdToContacts);
router.post("/webReservations", sendEmailReservationToClient);
router.get("/unsubscribe/:id", unsubscribeEmails);

module.exports = router;
