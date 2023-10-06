const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const marketingCampaignSchema = new Schema(
  {
    title: { type: String },
    image: { type: String },
    description: { type: String, required: true },
    contactList: [{ type: mongoose.Types.ObjectId, ref: "contacts" }],
    consultant: { type: mongoose.Types.ObjectId, ref: "consultants" },
  },
  {
    timestamps: true,
  }
);

const Contact = mongoose.model("marketingCampaign", marketingCampaignSchema);

module.exports = Contact;
