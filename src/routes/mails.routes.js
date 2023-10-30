const express = require("express");
const { isAuth } = require("../middlewares/auth.middleware");
const {
  sendAdsToContact,
  sendAdToContacts,
  sendEmailReservationToClient,
} = require("../controllers/mails.controller");
const {
  getConsultantTokenById,
} = require("../controllers/consultant.controller");
const { createTransporter } = require("../middlewares/transporterMiddleare");

const router = express.Router();

router.post("/sendAdsToContact", getConsultantTokenById, sendAdsToContact);
router.post(
  "/sendAdToContacts",
  getConsultantTokenById,
  createTransporter,
  sendAdToContacts
);
router.post("/webReservations", sendEmailReservationToClient);

module.exports = router;
