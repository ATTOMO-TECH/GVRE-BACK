const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const contactSchema = new Schema(
  {
    fullName: { type: String, required: true },
    tag: [{ type: String, enum: ["Cliente", "Propietario"], required: true }],
    email: { type: String, required: true },
    contactMobileNumber: { type: String },
    contactPhoneNumber: { type: String },
    company: { type: String },
    contactDirection: {
      address: {
        street: { type: String },
        directionNumber: { type: String },
        directionFloor: { type: String },
      },
      postalCode: { type: String },
      city: { type: String },
      country: { type: String },
    },
    contactComments: { type: String },
    notReceiveCommunications: { type: Boolean },
    consultant: { type: mongoose.Types.ObjectId, ref: "consultants" },
    receivedEmails: [
      {
        ad: { type: mongoose.Types.ObjectId, ref: "ads" },
        sendDate: { type: Date },
        consultant: { type: mongoose.Types.ObjectId, ref: "consultants" },
      },
    ],
    marketingCampaings: [
      { type: mongoose.Types.ObjectId, ref: "marketingCampaign" },
    ],
    reciveMarketingCampaing: { type: Boolean },
  },
  {
    timestamps: true,
  }
);

const Contact = mongoose.model("contacts", contactSchema);

module.exports = Contact;
