const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// Si un envío "processing" lleva este tiempo sin actividad, el proceso que lo
// lanzó ya no existe (reinicio/deploy) y se considera interrumpido.
const STALLED_AFTER_MS = 5 * 60 * 1000;

const campaignSendSchema = new Schema(
  {
    campaign: {
      type: mongoose.Types.ObjectId,
      ref: "marketingCampaign",
      required: true,
    },
    consultant: { type: mongoose.Types.ObjectId, ref: "consultants" },
    consultantEmail: { type: String },
    subject: { type: String },
    status: {
      type: String,
      enum: ["processing", "completed", "interrupted"],
      default: "processing",
    },
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: {
      notFound: { type: Number, default: 0 },
      optedOut: { type: Number, default: 0 },
      invalidEmail: { type: Number, default: 0 },
      duplicated: { type: Number, default: 0 },
      alreadySent: { type: Number, default: 0 },
    },
    sentContacts: [{ type: mongoose.Types.ObjectId, ref: "contacts" }],
    failures: [
      {
        _id: false,
        contact: { type: mongoose.Types.ObjectId, ref: "contacts" },
        email: { type: String },
        error: { type: String },
      },
    ],
    resumedFrom: { type: mongoose.Types.ObjectId, ref: "campaignSends" },
    lastActivityAt: { type: Date },
    finishedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

campaignSendSchema.methods.isStalled = function () {
  if (this.status !== "processing") return false;
  const lastActivity = this.lastActivityAt || this.createdAt;
  return Date.now() - new Date(lastActivity).getTime() > STALLED_AFTER_MS;
};

// Resumen para el frontend (sin la lista de contactos enviados)
campaignSendSchema.methods.toSummary = function () {
  return {
    _id: this._id,
    campaign: this.campaign,
    status: this.isStalled() ? "interrupted" : this.status,
    total: this.total,
    sent: this.sent,
    failed: this.failed,
    skipped: this.skipped,
    createdAt: this.createdAt,
    finishedAt: this.finishedAt,
  };
};

const CampaignSend = mongoose.model("campaignSends", campaignSendSchema);

module.exports = CampaignSend;
