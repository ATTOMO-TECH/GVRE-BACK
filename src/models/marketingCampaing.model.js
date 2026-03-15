const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const marketingCampaignSchema = new Schema(
  {
    title: { type: String },
    image: { type: String },
    description: { type: String, required: false },
    contactList: [{ type: mongoose.Types.ObjectId, ref: "contacts" }],
    consultant: { type: mongoose.Types.ObjectId, ref: "consultants" },
    htmlBody: {
      type: String,
      required: false,
    },
    design: {
      type: Object, // O Schema.Types.Mixed si prefieres
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

const Contact = mongoose.model("marketingCampaign", marketingCampaignSchema);

module.exports = Contact;
