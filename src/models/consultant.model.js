const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ZoneSchema = new Schema({
  zoneId: { type: String },
  zone: { type: String },
  name: { type: String },
  image: { type: String },
});

const consultantSchema = new Schema(
  {
    role: { type: String, enum: ["Admin", "Consultor"], default: "Consultor" },
    showOnWeb: { type: String, enum: ["Yes", "No"], default: "Yes" },
    fullName: { type: String, required: true },
    consultantEmail: { type: String, required: true },
    consultantPassword: { type: String, required: true },
    consultantToken: { type: String, required: true },
    avatar: { type: String },
    companyUnitLogo: { type: String },
    consultantMobileNumber: { type: String, required: true },
    consultantPhoneNumber: { type: String },
    position: { type: String },
    profession: { type: String },
    office1: { type: String },
    office2: { type: String },
    offices: [{ type: String }],
    consultantComments: { type: String },
    ads: { type: mongoose.Types.ObjectId, ref: "ads" },
    consultantEmailSignZones: {
      high: {
        zone1: ZoneSchema,
        zone2: ZoneSchema,
        zone3: ZoneSchema,
      },
      medium: {
        zone4: ZoneSchema,
        zone5: ZoneSchema,
        zone6: ZoneSchema,
      },
      low: {
        zone7: ZoneSchema,
        zone8: ZoneSchema,
        zone9: ZoneSchema,
      },
    },
  },
  {
    timestamps: true,
  },
);

const Consultant = mongoose.model("consultants", consultantSchema);

module.exports = Consultant;
