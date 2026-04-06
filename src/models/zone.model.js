const mongoose = require("mongoose");
const slug = require("mongoose-slug-updater"); // Asegúrate de haber hecho: npm install mongoose-slug-updater

mongoose.plugin(slug);

const Schema = mongoose.Schema;

const zoneSchema = new Schema(
  {
    zone: { type: String },
    subzone: { type: String, default: null },
    name: { type: String },
    slug: { type: String, slug: "name", index: true },
    id: { type: String },
    status: { type: Boolean, default: false },
    zoneDescription: { type: String },
  },
  {
    timestamps: true,
  },
);

const Zone = mongoose.model("zones", zoneSchema);

module.exports = Zone;
